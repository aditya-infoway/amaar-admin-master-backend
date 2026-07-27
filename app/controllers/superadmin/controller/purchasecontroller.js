const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");
const { updateAccountBalance } = require("../../../helper/accountBalance.js");

// ---------------- Normalize state string for comparison ----------------
const normalizeState = (s) =>
  (s ?? "").toString().trim().toLowerCase().replace(/\s*\(.*?\)\s*/g, "").replace(/\s+/g, " ");

// ---------------- GET NEXT BILL NO ----------------
const getNextBillNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found in session. Please select a company year.");

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "purchase",
      idColumn: "purchaseId",
      fixedPrefix: "P",
    });

    return successResponse(res, { billNo, fyLabel, financialYearId }, "Bill number generated successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE PURCHASE (Save Bill) ----------------
const createPurchase = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.body;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found in session. Please select a company year.");

    const {
      terms, accountId, billNo, purchaseBillNo, purchaseDate, branchId,
      dueDate, narration,
      transportCharge, loadingCharge, otherCharge, discountPct, discountAmount, roundAmount,
      cashAccountId, bankAccountId, paymentMode, chequeNo, chequeDate, chequeClearDate, bankNarration,
      items,
      createdBy, createdType,
    } = req.body;

    if (!accountId) return errorResponse(res, "Party is required.");
    if (!purchaseBillNo) return errorResponse(res, "Purchase Bill No is required.");
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Please add at least one item.");
    }

    const finalCreatedBy = createdBy != null ? Number(createdBy) : companyId;
    const finalCreatedType = createdType || "Super Admin";

    // ---- Financial Year validate ----
    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- purchaseBillNo uniqueness — company + FY wise ----
    const dupCheck = await selectWithJoins(
      "purchase", [], { companyId, financialYearId: fy.financialYearId, purchaseBillNo, delete: 0 }, ["purchaseId"]
    );
    if (dupCheck.length > 0) {
      return errorResponse(res, "This Purchase Bill No already exists for this financial year.");
    }

    // ---- Party (account) validate + state fetch ----
    const partyRows = await selectWithJoins(
      "account", [], { id: accountId, companyId, delete: 0 },
      ["id", "accountName", "stateName", "currentBalance", "currentDrOrCr"]
    );
    if (partyRows.length === 0) return errorResponse(res, "Selected party is invalid.");
    const party = partyRows[0];

    // ---- Company state fetch ----
    const companyRows = await selectWithJoins(
      "companydetails", [], { companyId, delete: 0 }, ["companyId", "state"]
    );
    if (companyRows.length === 0) return errorResponse(res, "Company details not found.");
    const companyStateVal = companyRows[0].state;

    // ---- Cash / Bank account validate + balance fetch ----
    let cashAcc = null, bankAcc = null;

    if (terms === "Cash") {
      if (!cashAccountId) return errorResponse(res, "Cash account is required.");
      const cashRows = await selectWithJoins(
        "account", [], { id: cashAccountId, companyId, delete: 0 },
        ["id", "accountName", "currentBalance", "currentDrOrCr"]
      );
      if (cashRows.length === 0) return errorResponse(res, "Selected cash account is invalid.");
      cashAcc = cashRows[0];
    }

    if (terms === "Bank") {
      if (!bankAccountId) return errorResponse(res, "Bank account is required.");
      const bankRows = await selectWithJoins(
        "account", [], { id: bankAccountId, companyId, delete: 0 },
        ["id", "accountName", "currentBalance", "currentDrOrCr"]
      );
      if (bankRows.length === 0) return errorResponse(res, "Selected bank account is invalid.");
      bankAcc = bankRows[0];

      if (!paymentMode) return errorResponse(res, "Payment mode is required.");
      if (paymentMode === "CHEQUE" && (!chequeNo || !chequeDate)) {
        return errorResponse(res, "Cheque No and Cheque Date are required for cheque payment.");
      }
    }

    // ---- Validate + recompute each item server-side ----
    let taxableValue = 0;
    let totalGst = 0;
    const cleanItems = [];

    for (const row of items) {
      if (!row.itemId) return errorResponse(res, `Item id missing for "${row.itemName || "an item"}".`);
      if (!row.qty || row.qty <= 0) return errorResponse(res, `Invalid quantity for "${row.itemName}".`);

      const itemRows = await selectWithJoins(
        "itemmaster", [], { itemId: row.itemId, companyId, delete: 0 }, ["itemId", "itemCode", "itemName", "hsnCode", "unit"]
      );
      if (itemRows.length === 0) {
        return errorResponse(res, `Item "${row.itemName}" not found or invalid.`);
      }

      const qty = Number(row.qty) || 0;
      const rate = Number(row.rate) || 0;
      const discount = Number(row.discount) || 0;
      const gstPct = Number(row.gstPct) || 0;

      const taxable = qty * rate * (1 - discount / 100);
      const gstAmt = taxable * gstPct / 100;
      const total = taxable + gstAmt;

      taxableValue += taxable;
      totalGst += gstAmt;

      cleanItems.push({
        itemId: row.itemId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        hsnCode: row.hsnCode || "",
        uom: row.uom || "",
        qty, rate, discount, taxable, gstPct, gstAmt, total,
      });
    }

    // ---- GST split: same state -> CGST+SGST, else IGST ----
    const isSameState =
      !!companyStateVal && !!party.stateName &&
      normalizeState(companyStateVal) === normalizeState(party.stateName);

    const finalCgst = isSameState ? Number((totalGst / 2).toFixed(2)) : 0;
    const finalSgst = isSameState ? Number((totalGst / 2).toFixed(2)) : 0;
    const finalIgst = isSameState ? 0 : Number(totalGst.toFixed(2));

    const otherTotal = (Number(transportCharge) || 0) + (Number(loadingCharge) || 0) + (Number(otherCharge) || 0);
    const grandTotal =
      taxableValue + totalGst + otherTotal - (Number(discountAmount) || 0) + (Number(roundAmount) || 0);

    // ---- Payment terms ke hisab se balance check pehle (fail-fast, DB insert se pehle) ----
    if (terms === "Cash" && Number(cashAcc.currentBalance) < grandTotal) {
      return errorResponse(
        res,
        `Insufficient Cash Balance! You need ₹${grandTotal} but only ₹${cashAcc.currentBalance} available.`
      );
    }
    if (terms === "Bank" && Number(bankAcc.currentBalance) < grandTotal) {
      return errorResponse(
        res,
        `Insufficient Bank Balance! You need ₹${grandTotal} but only ₹${bankAcc.currentBalance} available.`
      );
    }

    // ---- Save Purchase ----
    const purchase = await saveModel("purchase", {
      companyId,
      financialYearId: fy.financialYearId,
      date: new Date(),
      terms,
      accountId,
      branchId: branchId || null,
      billNo,
      purchaseBillNo,
      purchaseDate,
      dueDate: terms === "Credit" ? (dueDate || null) : null,
      narration: narration || "",

      transportCharge: Number(transportCharge) || 0,
      loadingCharge: Number(loadingCharge) || 0,
      otherCharge: Number(otherCharge) || 0,
      discountPct: Number(discountPct) || 0,
      discountAmount: Number(discountAmount) || 0,
      roundAmount: Number(roundAmount) || 0,

      taxableValue: Number(taxableValue.toFixed(2)),
      gstAmount: Number(totalGst.toFixed(2)),
      cgstAmount: finalCgst,
      sgstAmount: finalSgst,
      igstAmount: finalIgst,
      grandTotal: Number(grandTotal.toFixed(2)),

      billStatus: "pending",
      createdBy: finalCreatedBy,
      createdType: finalCreatedType,
      delete: 0,
    });

    // ---- Save Purchase Items ----
    for (const row of cleanItems) {
      await saveModel("purchasedetails", {
        purchaseId: purchase.purchaseId,
        companyId,
        itemId: row.itemId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        hsnCode: row.hsnCode,
        uom: row.uom,
        qty: row.qty,
        rate: row.rate,
        discount: row.discount,
        taxable: row.taxable,
        gstPct: row.gstPct,
        gstAmt: row.gstAmt,
        total: row.total,
        currentStock: row.qty,
        delete: 0,
      });
    }

    // =========================================================
    // Payment entry + balance update (terms wise)
    // =========================================================
    const roundedGrandTotal = Number(grandTotal.toFixed(2));

    // ---- Sirf party ki liability badhegi (CR), koi cash/bank movement nahi ----
    await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "PURCHASE",
      paymentCollectedByModules: "PUR",
      voucherNo: null,
      date: purchaseDate,
      selfAccountId: accountId,
      selfDrOrCr: "CR",
      accountId: accountId,       // schema NOT NULL hai isliye same party rakha (single-sided entry)
      accountDrOrCr: "CR",
      amount: roundedGrandTotal,
      narration: narration || "",
      paymentMode: "CREDIT",
      purchaseId: purchase.purchaseId,   // ledger report join ke liye
      createdBy: finalCreatedBy,
      createdType: finalCreatedType,
      status: "active",
      delete: 0,
    });

    if (terms === "Credit") {

      // Party ka payable balance badhao
      await updateAccountBalance(accountId, roundedGrandTotal, "CR", companyId);
    }

    if (terms === "Cash") {
      const { voucherNo } = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "payment",
        idColumn: "paymentId",
        fixedPrefix: "CP",
        extraWhere: { voucherType: "CASH PAYMENT" },
      });

      await saveModel("payment", {
        companyId,
        financialYearId: fy.financialYearId,
        voucherType: "CASH PAYMENT",
        paymentCollectedByModules: "PCP",
        voucherNo,
        date: purchaseDate,
        selfAccountId: cashAccountId,
        selfDrOrCr: "CR",              // cash account se paisa gaya
        accountId: accountId,          // party — reporting/reference ke liye
        accountDrOrCr: "DR",
        amount: roundedGrandTotal,
        narration: narration || "",
        paymentMode: "CASH",
        purchaseId: purchase.purchaseId,   // ledger report join ke liye
        createdBy: finalCreatedBy,
        createdType: finalCreatedType,
        status: "active",
        delete: 0,
      });

      // Sirf cash account credited hoga (paisa bahar gaya) — party balance touch nahi hoga
      await updateAccountBalance(cashAccountId, roundedGrandTotal, "CR", companyId);
    }

    if (terms === "Bank") {
      const { voucherNo } = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "payment",
        idColumn: "paymentId",
        fixedPrefix: "BP",
        extraWhere: { voucherType: "BANK PAYMENT" },
      });

      const modeUpper = String(paymentMode || "").toUpperCase();

      await saveModel("payment", {
        companyId,
        financialYearId: fy.financialYearId,
        voucherType: "BANK PAYMENT",
        paymentCollectedByModules: "PBP",
        voucherNo,
        date: purchaseDate,
        selfAccountId: bankAccountId,
        selfDrOrCr: "CR",
        accountId: accountId,          // party — reporting/reference ke liye
        accountDrOrCr: "DR",
        amount: roundedGrandTotal,
        narration: bankNarration || narration || "",
        paymentMode: modeUpper,
        chequeNo: modeUpper === "CHEQUE" ? chequeNo : null,
        chequeDate: modeUpper === "CHEQUE" ? chequeDate : null,
        chequeClearDate: modeUpper === "CHEQUE" ? (chequeClearDate || null) : null,
        purchaseId: purchase.purchaseId,   // ledger report join ke liye
        createdBy: finalCreatedBy,
        createdType: finalCreatedType,
        status: "active",
        delete: 0,
      });

      // Sirf bank account credited hoga (paisa bahar gaya)
      await updateAccountBalance(bankAccountId, roundedGrandTotal, "CR", companyId);
    }

    return successResponse(
      res,
      {
        purchaseId: purchase.purchaseId,
        isSameState,
        cgstAmount: finalCgst,
        sgstAmount: finalSgst,
        igstAmount: finalIgst,
        grandTotal: roundedGrandTotal,
      },
      "Purchase saved successfully"
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This Purchase Bill No already exists for this financial year.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getPurchaseList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
 
    const { financialYearId } = req.query;
 
    const purchaseWhere = { companyId, delete: 0 };
    if (financialYearId) purchaseWhere.financialYearId = financialYearId;
 
    const purchases = await selectWithJoins(
      "purchase",
      [],
      purchaseWhere,
      [
        "purchaseId", "purchaseDate", "terms", "accountId", "branchId",
        "billNo", "purchaseBillNo", "transportCharge", "loadingCharge",
        "otherCharge", "taxableValue", "gstAmount", "cgstAmount", "sgstAmount",
        "igstAmount", "grandTotal", "billStatus",
      ]
    );
 
    if (!purchases.length) {
      return successResponse(res, [], "Purchase list fetched successfully");
    }
 
    // ---- Related suppliers (account) ----
    const accountIds = [...new Set(purchases.map((p) => p.accountId).filter(Boolean))];
    let accountMap = {};
    if (accountIds.length) {
      const accounts = await selectWithJoins(
        "account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName", "mobileNo"]
      );
      accounts.forEach((a) => { accountMap[a.id] = a; });
    }
 
    // ---- Related branch / location ----
    const branchIds = [...new Set(purchases.map((p) => p.branchId).filter(Boolean))];
    let branchMap = {};
    if (branchIds.length) {
      try {
        const branches = await selectWithJoins(
          "branch", [], { branchId: branchIds, companyId, delete: 0 }, ["branchId", "branchName"]
        );
        branches.forEach((b) => { branchMap[b.branchId] = b; });
      } catch (e) {
        // agar "branch" table exist nahi karti to location blank rahega
        branchMap = {};
      }
    }
 
    // ---- Total qty per purchase (from purchasedetails) ----
    const purchaseIds = purchases.map((p) => p.purchaseId);
    const details = await selectWithJoins(
      "purchasedetails", [], { purchaseId: purchaseIds, companyId, delete: 0 }, ["purchaseId", "qty"]
    );
    const qtyMap = {};
    details.forEach((d) => {
      qtyMap[d.purchaseId] = (qtyMap[d.purchaseId] || 0) + Number(d.qty || 0);
    });
 
    const data = purchases.map((p) => {
      const account = accountMap[p.accountId] || {};
      const branch = branchMap[p.branchId] || {};
      return {
        id: String(p.purchaseId),
        purchaseDate: p.purchaseDate,
        terms: p.terms,
        supplierName: account.accountName || "",
        billNo: p.billNo,
        purchaseBillNo: p.purchaseBillNo,
        location: branch.branchName || "",
        totalQuantity: String(qtyMap[p.purchaseId] || 0),
        totalAmount: String(p.taxableValue),
        transportLoadingOtherCharge: String(
          (Number(p.transportCharge) || 0) + (Number(p.loadingCharge) || 0) + (Number(p.otherCharge) || 0)
        ),
        cgstAmount: String(p.cgstAmount),
        sgstAmount: String(p.sgstAmount),
        igstAmount: String(p.igstAmount),
        grandTotal: String(p.grandTotal),
        transportName: "", // schema mein column nahi he abhi
        mobileNo: account.mobileNo || "",
        vehicleNo: "", // schema mein column nahi he abhi
        status: p.billStatus,
      };
    });
 
    return successResponse(res, data, "Purchase list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GET PURCHASE BY ID (with items) ----------------
const getPurchaseById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const rows = await selectWithJoins(
      "purchase",
      [],
      { purchaseId: id, companyId, delete: 0 },
      [
        "purchaseId", "date", "terms", "accountId", "branchId",
        "billNo", "purchaseBillNo", "purchaseDate", "dueDate", "narration",
        "transportCharge", "loadingCharge", "otherCharge",
        "discountPct", "discountAmount", "roundAmount",
        "taxableValue", "gstAmount", "cgstAmount", "sgstAmount", "igstAmount",
        "grandTotal", "billStatus", "created",
      ]
    );

    if (rows.length === 0) return requiredmessage(res, "Purchase not found");
    const purchase = rows[0];

    // ---- Party details ----
    const partyRows = await selectWithJoins(
      "account", [], { id: purchase.accountId, companyId, delete: 0 },
      ["id", "accountName", "mobileNo", "stateName", "addressLine1"]
    );
    const party = partyRows[0] || {};

    // ---- Branch/location details ----
    let branch = {};
    if (purchase.branchId) {
      try {
        const branchRows = await selectWithJoins(
          "branch", [], { branchId: purchase.branchId, companyId, delete: 0 }, ["branchId", "branchName"]
        );
        branch = branchRows[0] || {};
      } catch (e) {
        branch = {};
      }
    }

    // ---- Items ----
    const items = await selectWithJoins(
      "purchasedetails",
      [],
      { purchaseId: purchase.purchaseId, companyId, delete: 0 },
      [
        "purchaseDetailsId", "itemId", "itemCode", "itemName", "hsnCode", "uom",
        "qty", "rate", "discount", "taxable", "gstPct", "gstAmt", "total",
        "verified",
      ]
    );

    return successResponse(
      res,
      {
        ...purchase,
        supplierName: party.accountName || "",
        supplierMobile: party.mobileNo || "",
        supplierAddress: party.addressLine1 || "",
        branchName: branch.branchName || "",
        items,
      },
      "Purchase fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- VERIFY PURCHASE ITEM ----------------
const verifyPurchaseItem = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { purchaseDetailsId } = req.body;
    if (!purchaseDetailsId) return errorResponse(res, "Purchase detail id is required.");

    const existing = await selectWithJoins(
      "purchasedetails", [], { purchaseDetailsId, companyId, delete: 0 }, ["purchaseDetailsId", "verified"]
    );
    if (existing.length === 0) return requiredmessage(res, "Purchase item not found.");

    if (existing[0].verified) {
      return successResponse(res, {}, "Item already verified.");
    }

    await updateModelHelper(
      "purchasedetails",
      { verified: true, updated: new Date() },
      { purchaseDetailsId, companyId }
    );

    return successResponse(res, {}, "Item verified successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getNextBillNo,
  createPurchase,
  getPurchaseList,
  getPurchaseById,
  verifyPurchaseItem,
};