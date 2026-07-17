const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  selectWithJoins,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

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
      prefixColumn: "purchasePrefix",
      tag: "",
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
    const financialYearId = req.financialYearId; // session se

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found in session. Please select a company year.");

    const {
      terms, accountId, billNo, purchaseBillNo, purchaseDate, branchId,
      dueDate, narration,
      transportCharge, loadingCharge, otherCharge, discountPct, discountAmount, roundAmount,
      cashAccountId, bankAccountId, paymentMode, chequeNo, chequeDate, chequeClearDate, bankNarration,
      items,
    } = req.body;

    if (!accountId) return errorResponse(res, "Party is required.");
    if (!purchaseBillNo) return errorResponse(res, "Purchase Bill No is required.");
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Please add at least one item.");
    }

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
      "account", [], { id: accountId, companyId, delete: 0 }, ["id", "accountName", "stateName"]
    );
    if (partyRows.length === 0) return errorResponse(res, "Selected party is invalid.");
    const party = partyRows[0];

    // ---- Company state fetch ----
    const companyRows = await selectWithJoins(
      "companydetails", [], { companyId, delete: 0 }, ["companyId", "state"]
    );
    if (companyRows.length === 0) return errorResponse(res, "Company details not found.");
    const companyStateVal = companyRows[0].state;

    // ---- Cash / Bank account validate ----
    if (terms === "Cash") {
      if (!cashAccountId) return errorResponse(res, "Cash account is required.");
      const cashRows = await selectWithJoins("account", [], { id: cashAccountId, companyId, delete: 0 }, ["id"]);
      if (cashRows.length === 0) return errorResponse(res, "Selected cash account is invalid.");
    }
    if (terms === "Bank") {
      if (!bankAccountId) return errorResponse(res, "Bank account is required.");
      const bankRows = await selectWithJoins("account", [], { id: bankAccountId, companyId, delete: 0 }, ["id"]);
      if (bankRows.length === 0) return errorResponse(res, "Selected bank account is invalid.");
      if (!paymentMode) return errorResponse(res, "Payment mode is required.");
      if (paymentMode === "CHEQUE" && (!chequeNo || !chequeDate)) {
        return errorResponse(res, "Cheque No and Cheque Date are required for cheque payment.");
      }
    }

    // ---- Validate + recompute each item server-side (don't trust frontend blindly) ----
    let taxableValue = 0;
    let totalGst = 0;
    const cleanItems = [];

    for (const row of items) {
      if (!row.itemId) return errorResponse(res, `Item id missing for "${row.itemName || "an item"}".`);
      if (!row.qty || row.qty <= 0) return errorResponse(res, `Invalid quantity for "${row.itemName}".`);

      // itemId company ka hi ho, aur active ho
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

    //   cashAccountId: terms === "Cash" ? cashAccountId : null,
    //   bankAccountId: terms === "Bank" ? bankAccountId : null,
    //   paymentMode: terms === "Bank" ? paymentMode : null,
    //   chequeNo: paymentMode === "CHEQUE" ? chequeNo : null,
    //   chequeDate: paymentMode === "CHEQUE" ? chequeDate : null,
    //   chequeClearDate: paymentMode === "CHEQUE" ? (chequeClearDate || null) : null,
    //   bankNarration: terms === "Bank" ? (bankNarration || "") : "",

      billStatus: "pending",
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
        delete: 0,
      });
    }

    return successResponse(
      res,
      {
        purchaseId: purchase.purchaseId,
        isSameState,
        cgstAmount: finalCgst,
        sgstAmount: finalSgst,
        igstAmount: finalIgst,
        grandTotal,
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

module.exports = {
  getNextBillNo,
  createPurchase,
};