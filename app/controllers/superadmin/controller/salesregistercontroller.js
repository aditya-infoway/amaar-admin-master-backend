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
const { postSalesGst, reverseSalesGst } = require("../../../helper/gstLedger.js");
const { updateAccountBalance } = require("../../../helper/accountBalance.js");
// ============================================================
// HELPERS
// ============================================================

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const orNull = (value) =>
  value === undefined || value === null || value === "" ? null : value;

/**
 * Ek item line ka calculation (frontend ke calcItem jaisa):
 *   amount        = qty × basicPrice
 *   taxableAmount = amount − discount
 *   taxAmount     = taxableAmount × taxPct / 100
 *   netAmount     = taxableAmount + taxAmount
 */
const calcLine = (item) => {
  const qty = Number(item.qty) || 0;
  const basicPrice = Number(item.basicPrice) || 0;
  const amount = round2(qty * basicPrice);
  const discount = round2(
    Math.min(Math.max(Number(item.discount) || 0, 0), amount),
  );
  const taxableAmount = round2(amount - discount);
  const taxPct = Number(item.taxPct) || 0;
  const taxAmount = round2((taxableAmount * taxPct) / 100);
  const netAmount = round2(taxableAmount + taxAmount);

  return { qty, basicPrice, amount, discount, taxableAmount, taxPct, taxAmount, netAmount };
};

/**
 * Items + body se saare totals server pe calculate karta hai.
 * CGST/SGST vs IGST ka decision frontend ke igstAmount se aata hai
 * (company state == party state check wahan hota hai).
 */
const buildTotals = (items, body) => {
  const lines = items.map((i) => ({ ...i, ...calcLine(i) }));

  const subTotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const discountAmount = round2(lines.reduce((s, l) => s + l.discount, 0));
  const taxableAmount = round2(subTotal - discountAmount);
  const totalTax = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  const grandTotal = round2(taxableAmount + totalTax);

  const useIgst = Number(body.igstAmount) > 0;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (useIgst) {
    igstAmount = totalTax;
  } else {
    cgstAmount = round2(totalTax / 2);
    sgstAmount = round2(totalTax - cgstAmount); // sum exact rahe
  }

  return {
    lines,
    subTotal,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    grandTotal,
  };
};

/** Payment / terms ke cross-field checks (Joi se bachi hui). */
const validatePayment = (body) => {
  if (
    body.terms === "Bank" &&
    body.paymentMode === "CHEQUE" &&
    (!String(body.chequeNo || "").trim() || !body.chequeDate)
  ) {
    return "Cheque No and Cheque Date are required.";
  }
  return null;
};

const getAccountMap = async (ids, companyId) => {
  if (!ids.length) return {};

  const build = (rows) =>
    rows.reduce((map, acc) => {
      map[String(acc.id)] = acc;
      return map;
    }, {});

  // "address" column har DB me na ho to bina uske fallback
  try {
    const rows = await selectWithJoins(
      "account",
      [],
      { id: ids, companyId, delete: 0 },
      ["id", "accountName", "mobileNo", "address"],
    );
    return build(rows);
  } catch (e) {
    try {
      const rows = await selectWithJoins(
        "account",
        [],
        { id: ids, companyId, delete: 0 },
        ["id", "accountName", "mobileNo"],
      );
      return build(rows);
    } catch (err) {
      console.error("Error fetching accounts:", err.message);
      return {};
    }
  }
};

const getBranchMap = async (ids, companyId) => {
  if (!ids.length) return {};
  try {
    const rows = await selectWithJoins(
      "branch",
      [],
      { branchId: ids, companyId },
      ["branchId", "branchName"],
    );
    return rows.reduce((map, b) => {
      map[String(b.branchId)] = b.branchName || "";
      return map;
    }, {});
  } catch (err) {
    console.error("Error fetching branches:", err.message);
    return {};
  }
};

// ============================================================
// GET NEXT SALES INVOICE NO
// ============================================================

const getNextSalesInvoiceNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    let billNo, fyLabel;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const result = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "sales",
        idColumn: "salesId",
       
    prefixFor: "SALES INVOICE",
      });

      const existing = await selectWithJoins(
        "sales",
        [],
        {
          companyId,
          financialYearId: fy.financialYearId,
          salesInvoiceNo: result.billNo,
          delete: 0,
        },
        ["salesId"],
      );

      if (existing.length === 0) {
        billNo = result.billNo;
        fyLabel = result.fyLabel;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    if (!billNo) {
      return errorResponse(
        res,
        "Could not generate a unique Sales Invoice number. Please try again.",
      );
    }

    return successResponse(
      res,
      { invoiceNo: billNo, fyLabel, financialYearId: fy.financialYearId },
      "Sales Invoice number generated successfully",
    );
  } catch (error) {
    console.error("getNextSalesInvoiceNo error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// SHARED: CHECKS FOR CREATE + UPDATE
// ============================================================

/**
 * Party, Sales Order, items aur duplicate invoice no check karta hai.
 * Error string return karta hai (ya null).
 */
const runCommonChecks = async ({ companyId, fy, body, excludeSalesId }) => {
  // ---- Party ----
  const accountId = normalizeId(body.accountId);
  const accountRows = await selectWithJoins(
    "account",
    [],
    { id: accountId, companyId, delete: 0 },
    ["id"],
  );
  if (!accountRows.length) return "Selected party (account) was not found.";

  // ---- Sales Order (agar select hua ho) ----
  const salesOrderId = normalizeId(body.salesOrderId);
  if (salesOrderId) {
    const soRows = await selectWithJoins(
      "salesorder",
      [],
      { salesOrderId, companyId, delete: 0 },
      ["salesOrderId", "soNo"],
    );
    if (!soRows.length) return "Selected Sales Order was not found.";

    const alreadyBilled = await selectWithJoins(
      "sales",
      [],
      { companyId, salesOrderId, delete: 0 },
      ["salesId", "salesInvoiceNo"],
    );
    const other = alreadyBilled.find(
      (r) => String(r.salesId) !== String(excludeSalesId || ""),
    );
    if (other) {
      return `Sales Invoice already exists for this Sales Order (${other.salesInvoiceNo}).`;
    }
  }

  // ---- Items exist ----
  const itemIds = [...new Set(body.items.map((i) => normalizeId(i.itemId)))];
  if (itemIds.some((id) => !id)) return "One or more items are invalid.";

  const itemRows = await selectWithJoins(
    "itemmaster",
    [],
    { itemId: itemIds },
    ["itemId"],
  );
  if (itemRows.length !== itemIds.length) {
    return "One or more selected items were not found.";
  }

  // ---- Duplicate invoice no ----
  const dup = await selectWithJoins(
    "sales",
    [],
    {
      companyId,
      financialYearId: fy.financialYearId,
      salesInvoiceNo: String(body.salesInvoiceNo).trim(),
      delete: 0,
    },
    ["salesId"],
  );
  const anotherInvoice = dup.find(
    (r) => String(r.salesId) !== String(excludeSalesId || ""),
  );
  if (anotherInvoice) return "This Sales Invoice No already exists.";

  return null;
};

const detailRow = (salesId, companyId, line) => ({
  salesId,
  companyId,
  itemId: normalizeId(line.itemId),
  itemCode: orNull(line.itemCode),
  itemDescription: orNull(line.itemDescription),
  hsnCode: orNull(line.hsnCode),
  uom: orNull(line.uom),
  qty: line.qty,
  basicPrice: line.basicPrice,
  amount: line.amount,
  discount: line.discount,
  taxableAmount: line.taxableAmount,
  taxPct: line.taxPct,
  taxAmount: line.taxAmount,
  netAmount: line.netAmount,
  delete: 0,
});

/** Header ke payment-related fields terms ke hisaab se. */
const paymentFields = (body) => {
  const isBank = body.terms === "Bank";
  const isCheque = isBank && body.paymentMode === "CHEQUE";
  return {
    dueDate: body.terms === "Credit" ? orNull(body.dueDate) : null,
    cashAccountId: body.terms === "Cash" ? normalizeId(body.cashAccountId) : null,
    bankAccountId: isBank ? normalizeId(body.bankAccountId) : null,
    paymentMode: isBank ? orNull(body.paymentMode) : null,
    chequeNo: isCheque ? orNull(body.chequeNo) : null,
    chequeDate: isCheque ? orNull(body.chequeDate) : null,
    chequeClearDate: isCheque ? orNull(body.chequeClearDate) : null,
    bankNarration: isBank ? orNull(body.bankNarration) : null,
  };
};
/** Sales GST (CR on Sales CGST/SGST/IGST) post karta hai. Create + update dono use karte hain. */
const postInvoiceGst = async ({ req, companyId, fy, body, totals, salesId }) => {
  const partyRows = await selectWithJoins(
    "account", [],
    { id: normalizeId(body.accountId), companyId, delete: 0 },
    ["accountName"],
  );
  const partyName = partyRows[0]?.accountName || "";
  const createdBy = req.employeeId ? Number(req.employeeId) : Number(body.createdBy) || 0;
  const createdType = req.employeeId ? "Sale Executive" : body.createdType || null;
  const salesInvoiceNo = String(body.salesInvoiceNo).trim();

  const accountId = normalizeId(body.accountId);
  const amount = totals.grandTotal;
  const date = body.salesDate;
  const terms = body.terms;

  // ---- Party DR (single-sided, har terms me) ----
  await saveModel("payment", {
    companyId, financialYearId: fy.financialYearId,
    voucherType: "SALES",
    paymentCollectedByModules: "SALE",
    voucherNo: null,
    date,
    selfAccountId: accountId, selfDrOrCr: "DR",
    accountId, accountDrOrCr: "DR",
    amount,
    narration: `${salesInvoiceNo} — ${partyName}`.trim(),
    paymentMode: "CREDIT",
    salesId,
    createdBy, createdType,
    status: "active", delete: 0,
  });

  if (terms === "Credit") {
    await updateAccountBalance(accountId, amount, "DR", companyId);
  }

  if (terms === "Cash") {
    const cashAccountId = normalizeId(body.cashAccountId);
    const { voucherNo } = await generateVoucherNo({
      companyId, financialYearId: fy.financialYearId,
      tableName: "payment", idColumn: "paymentId",
      fixedPrefix: "CR", extraWhere: { voucherType: "CASH RECEIPT" },
    });
    await saveModel("payment", {
      companyId, financialYearId: fy.financialYearId,
      voucherType: "CASH RECEIPT",
      paymentCollectedByModules: "CR",
      voucherNo, date,
      selfAccountId: cashAccountId, selfDrOrCr: "DR",
      accountId, accountDrOrCr: "CR",
      amount,
      narration: body.narration || "",
      paymentMode: "CASH",
      salesId,
      createdBy, createdType,
      status: "active", delete: 0,
    });
    await updateAccountBalance(cashAccountId, amount, "DR", companyId);
  }

  if (terms === "Bank") {
    const bankAccountId = normalizeId(body.bankAccountId);
    const { voucherNo } = await generateVoucherNo({
      companyId, financialYearId: fy.financialYearId,
      tableName: "payment", idColumn: "paymentId",
      fixedPrefix: "BR", extraWhere: { voucherType: "BANK RECEIPT" },
    });
    const modeUpper = String(body.paymentMode || "").toUpperCase();
    await saveModel("payment", {
      companyId, financialYearId: fy.financialYearId,
      voucherType: "BANK RECEIPT",
      paymentCollectedByModules: "BR",
      voucherNo, date,
      selfAccountId: bankAccountId, selfDrOrCr: "DR",
      accountId, accountDrOrCr: "CR",
      amount,
      narration: body.bankNarration || body.narration || "",
      paymentMode: modeUpper,
      chequeNo: modeUpper === "CHEQUE" ? body.chequeNo : null,
      chequeDate: modeUpper === "CHEQUE" ? body.chequeDate : null,
      chequeClearDate: modeUpper === "CHEQUE" ? (body.chequeClearDate || null) : null,
      salesId,
      createdBy, createdType,
      status: "active", delete: 0,
    });
    await updateAccountBalance(bankAccountId, amount, "DR", companyId);
  }

  // ---- Sales GST (CR) ----
  await postSalesGst({
    companyId, financialYearId: fy.financialYearId, date,
    cgst: totals.cgstAmount, sgst: totals.sgstAmount, igst: totals.igstAmount,
    salesInvoiceNo, partyName, createdBy, createdType,
  });
};
// ============================================================
// CREATE SALES
// ============================================================

const createSales = async (req, res) => {
  let savedSalesId = null;

  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const body = req.body;

    const fy = await getFinancialYearById(body.financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    const paymentError = validatePayment(body);
    if (paymentError) return errorResponse(res, paymentError);

    const checkError = await runCommonChecks({ companyId, fy, body });
    if (checkError) return errorResponse(res, checkError);

    // Frontend ke amounts pe bharosa nahi — server pe dobara calculate
    const totals = buildTotals(body.items, body);

    // ---- Header ----
    const sales = await saveModel("sales", {
      companyId,
      financialYearId: fy.financialYearId,

      salesInvoiceNo: String(body.salesInvoiceNo).trim(),
      salesDate: body.salesDate,
      terms: body.terms,

      salesOrderId: normalizeId(body.salesOrderId),
      accountId: normalizeId(body.accountId),
      branchId: normalizeId(body.branchId),

      narration: orNull(body.narration),

      subTotal: totals.subTotal,
      taxableAmount: totals.taxableAmount,
      discountAmount: totals.discountAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      grandTotal: totals.grandTotal,

      ...paymentFields(body),

      status: "pending",

      createdBy: req.employeeId ? String(req.employeeId) : body.createdBy || null,
      createdtype: req.employeeId ? "Sale Executive" : body.createdType || null,

      delete: 0,
    });

    savedSalesId = sales.salesId;

    // ---- Items ----
    for (const line of totals.lines) {
      await saveModel("salesdetails", detailRow(savedSalesId, companyId, line));
    }
    // ---- Sales GST ----
      // ---- Sales ledger + GST ----
    await postInvoiceGst({ req, companyId, fy, body, totals, salesId: savedSalesId });
    return successResponse(
      res,
      {
        salesId: savedSalesId,
        salesInvoiceNo: String(body.salesInvoiceNo).trim(),
        accountId: normalizeId(body.accountId),
        subTotal: totals.subTotal,
        taxableAmount: totals.taxableAmount,
        discountAmount: totals.discountAmount,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        grandTotal: totals.grandTotal,
      },
      "Sales Invoice saved successfully",
    );
     } catch (error) {
    if (savedSalesId) {
      try {
        await reverseSalesGst(req.companyId, String(req.body.salesInvoiceNo).trim());
        await updateModelHelper(
          "payment",
          { delete: 1, voucherNo: null, updated: new Date() },
          { salesId: savedSalesId, companyId: req.companyId },
        );
        await updateModelHelper(
          "sales",
          { delete: 1, updated: new Date() },
          { salesId: savedSalesId, companyId: req.companyId },
        );
        await updateModelHelper(
          "salesdetails",
          { delete: 1, updated: new Date() },
          { salesId: savedSalesId, companyId: req.companyId },
        );
      } catch (rollbackErr) {
        console.error("createSales rollback failed:", rollbackErr.message);
      }
    }
   
  

    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This Sales Invoice already exists.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET SALES LIST (REGISTER)
// ============================================================

const getSalesList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { financialYearId, role } = req.query;

    const branchId = req.branchId;
    const employeeId = req.employeeId;

    const where = { companyId, delete: 0 };

    // EMPLOYEE
    if (employeeId) {
      where.createdBy = String(employeeId);
      where.createdtype = "Sale Executive";
    }
    // BRANCH
    else if (role === "Branch") {
      if (!branchId) return requiredmessage(res, "Branch not found.");
      where.branchId = branchId;
    }

    if (financialYearId) where.financialYearId = financialYearId;

    const salesRows = await selectWithJoins(
      "sales",
      [],
      where,
      [
        "salesId",
        "financialYearId",
        "salesInvoiceNo",
        "salesDate",
        "terms",
        "salesOrderId",
        "accountId",
        "branchId",
        "subTotal",
        "taxableAmount",
        "discountAmount",
        "cgstAmount",
        "sgstAmount",
        "igstAmount",
        "grandTotal",
        "status",
        "createdBy",
        "createdtype",
        "created",
        "updated",
      ],
      [["salesId", "DESC"]],
    );

    if (!salesRows.length) {
      return successResponse(res, [], "Sales list fetched successfully");
    }

    const salesIds = salesRows.map((r) => r.salesId);

    // ---- Employees (createdBy name) ----
    const employeeIds = salesRows
      .map((r) => r.createdBy)
      .filter((id) => id && id !== "Admin" && !isNaN(Number(id)));

    let employeeMap = {};
    if (employeeIds.length > 0) {
      try {
        const employees = await selectWithJoins(
          "employee",
          [],
          { employeeId: employeeIds },
          ["employeeId", "employeeName"],
        );
        employeeMap = employees.reduce((map, emp) => {
          map[String(emp.employeeId)] = emp.employeeName || String(emp.employeeId);
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching employees:", err.message);
      }
    }

    // ---- Party ----
    const accountIds = [
      ...new Set(salesRows.map((r) => r.accountId).filter(Boolean)),
    ];
    const accountMap = await getAccountMap(accountIds, companyId);

    // ---- Branch (location) ----
    const branchIds = [
      ...new Set(salesRows.map((r) => r.branchId).filter(Boolean)),
    ];
    const branchMap = await getBranchMap(branchIds, companyId);

    // ---- Sales Order numbers ----
    const soIds = [
      ...new Set(salesRows.map((r) => r.salesOrderId).filter(Boolean)),
    ];
    let soMap = {};
    if (soIds.length > 0) {
      try {
        const sos = await selectWithJoins(
          "salesorder",
          [],
          { salesOrderId: soIds, companyId, delete: 0 },
          ["salesOrderId", "soNo"],
        );
        soMap = sos.reduce((map, so) => {
          map[String(so.salesOrderId)] = so.soNo || "";
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching sales orders:", err.message);
      }
    }

    // ---- Total quantity (items ka sum) ----
    let qtyMap = {};
    try {
      const details = await selectWithJoins(
        "salesdetails",
        [],
        { salesId: salesIds, delete: 0 },
        ["salesId", "qty"],
      );
      qtyMap = details.reduce((map, d) => {
        map[String(d.salesId)] = (map[String(d.salesId)] || 0) + (Number(d.qty) || 0);
        return map;
      }, {});
    } catch (err) {
      console.error("Error fetching sales details:", err.message);
    }

    const data = salesRows.map((s) => {
      let createdByName = s.createdBy || "";
      if (createdByName !== "Admin" && !isNaN(Number(createdByName))) {
        createdByName = employeeMap[String(createdByName)] || createdByName;
      }

      return {
        id: String(s.salesId),
        financialYearId: s.financialYearId,

        salesDate: s.salesDate || "",
        terms: s.terms || "",

        partyName: accountMap[String(s.accountId)]?.accountName || "",
        accountId: s.accountId || null,

        salesInvoiceNo: s.salesInvoiceNo || "",
        salesOrderNo: soMap[String(s.salesOrderId)] || "",

        location: branchMap[String(s.branchId)] || "Main Branch",

        totalQuantity: qtyMap[String(s.salesId)] || 0,

        subTotal: Number(s.subTotal) || 0,
        taxableAmount: Number(s.taxableAmount) || 0,
        discountAmount: Number(s.discountAmount) || 0,
        cgstAmount: Number(s.cgstAmount) || 0,
        sgstAmount: Number(s.sgstAmount) || 0,
        igstAmount: Number(s.igstAmount) || 0,
        grandTotal: Number(s.grandTotal) || 0,

        status: s.status || "",

        createdBy: createdByName,
        createdType: s.createdtype || "",
        createdAt: s.created,
        updatedAt: s.updated,
      };
    });

    return successResponse(res, data, "Sales list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET SALES BY ID (DETAILS DRAWER)
// ============================================================

const getSalesById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;
    if (!id) return errorResponse(res, "Sales id is required.");

    const rows = await selectWithJoins(
      "sales",
      [],
      { salesId: id, companyId, delete: 0 },
      [
        "salesId",
        "financialYearId",
        "salesInvoiceNo",
        "salesDate",
        "terms",
        "salesOrderId",
        "accountId",
        "branchId",
        "dueDate",
        "narration",
        "subTotal",
        "taxableAmount",
        "discountAmount",
        "cgstAmount",
        "sgstAmount",
        "igstAmount",
        "grandTotal",
        "cashAccountId",
        "bankAccountId",
        "paymentMode",
        "chequeNo",
        "chequeDate",
        "chequeClearDate",
        "bankNarration",
        "status",
        "createdBy",
        "createdtype",
        "created",
        "updated",
      ],
    );

    if (!rows.length) return requiredmessage(res, "Sales Invoice not found.");

    const s = rows[0];

    const accountMap = await getAccountMap(s.accountId ? [s.accountId] : [], companyId);
    const account = accountMap[String(s.accountId)];

    const branchMap = await getBranchMap(s.branchId ? [s.branchId] : [], companyId);

    let salesOrderNo = "";
    if (s.salesOrderId) {
      const soRows = await selectWithJoins(
        "salesorder",
        [],
        { salesOrderId: s.salesOrderId, companyId, delete: 0 },
        ["salesOrderId", "soNo"],
      );
      if (soRows.length) salesOrderNo = soRows[0].soNo || "";
    }

    const details = await selectWithJoins(
      "salesdetails",
      [],
      { salesId: s.salesId, delete: 0 },
      [
        "salesDetailsId",
        "itemId",
        "itemCode",
        "itemDescription",
        "hsnCode",
        "uom",
        "qty",
        "basicPrice",
        "amount",
        "discount",
        "taxableAmount",
        "taxPct",
        "taxAmount",
        "netAmount",
      ],
      [["salesDetailsId", "ASC"]],
    );

    return successResponse(
      res,
      {
        salesId: s.salesId,
        financialYearId: s.financialYearId,

        salesDate: s.salesDate || "",
        salesInvoiceNo: s.salesInvoiceNo || "",
        salesOrderId: s.salesOrderId || null,
        salesOrderNo,
        terms: s.terms || "",
        dueDate: s.dueDate || "",
        narration: s.narration || "",

        accountId: s.accountId || null,
        partyName: account?.accountName || "",
        partyMobile: account?.mobileNo || "",
        partyAddress: account?.address || "",

        branchId: s.branchId || null,
        branchName: branchMap[String(s.branchId)] || "",

        subTotal: Number(s.subTotal) || 0,
        taxableAmount: Number(s.taxableAmount) || 0,
        discountAmount: Number(s.discountAmount) || 0,
        cgstAmount: Number(s.cgstAmount) || 0,
        sgstAmount: Number(s.sgstAmount) || 0,
        igstAmount: Number(s.igstAmount) || 0,
        grandTotal: Number(s.grandTotal) || 0,

        cashAccountId: s.cashAccountId || null,
        bankAccountId: s.bankAccountId || null,
        paymentMode: s.paymentMode || "",
        chequeNo: s.chequeNo || "",
        chequeDate: s.chequeDate || "",
        chequeClearDate: s.chequeClearDate || "",
        bankNarration: s.bankNarration || "",

        status: s.status || "",

        createdBy: s.createdBy || "",
        createdType: s.createdtype || "",
        createdAt: s.created,
        updatedAt: s.updated,

        items: details.map((d) => ({
          salesDetailsId: d.salesDetailsId,
          itemId: d.itemId,
          itemCode: d.itemCode || "",
          itemDescription: d.itemDescription || "",
          hsnCode: d.hsnCode || "",
          uom: d.uom || "",
          qty: Number(d.qty) || 0,
          basicPrice: Number(d.basicPrice) || 0,
          // drawer / form ke "Taxable Amount" column = qty × price (discount se pehle)
          taxableAmount: Number(d.amount) || 0,
          discount: Number(d.discount) || 0,
          taxableAfterDiscount: Number(d.taxableAmount) || 0,
          taxPct: Number(d.taxPct) || 0,
          taxAmount: Number(d.taxAmount) || 0,
          netAmount: Number(d.netAmount) || 0,
        })),
      },
      "Sales Invoice fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// UPDATE SALES
// ============================================================

const updateSales = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;
    if (!id) return errorResponse(res, "Sales id is required.");

    const existingRows = await selectWithJoins(
      "sales",
      [],
      { salesId: id, companyId, delete: 0 },
      ["salesId", "salesInvoiceNo"],
    );
    if (!existingRows.length) return requiredmessage(res, "Sales Invoice not found.");

    const body = req.body;

    const fy = await getFinancialYearById(body.financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    const paymentError = validatePayment(body);
    if (paymentError) return errorResponse(res, paymentError);

    const checkError = await runCommonChecks({
      companyId,
      fy,
      body,
      excludeSalesId: id,
    });
    if (checkError) return errorResponse(res, checkError);

    const totals = buildTotals(body.items, body);
    // purani GST entries reverse (purana invoice no use karo, kyunki edit me no. badal sakta hai)
    await reverseSalesGst(companyId, existingRows[0].salesInvoiceNo);
    // ---- Header update ----
    await updateModelHelper(
      "sales",
      {
        financialYearId: fy.financialYearId,

        salesInvoiceNo: String(body.salesInvoiceNo).trim(),
        salesDate: body.salesDate,
        terms: body.terms,

        salesOrderId: normalizeId(body.salesOrderId),
        accountId: normalizeId(body.accountId),
        branchId: normalizeId(body.branchId),

        narration: orNull(body.narration),

        subTotal: totals.subTotal,
        taxableAmount: totals.taxableAmount,
        discountAmount: totals.discountAmount,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        grandTotal: totals.grandTotal,

        ...paymentFields(body),

        updated: new Date(),
      },
      { salesId: id, companyId, delete: 0 },
    );

    // ---- Items: purane soft-delete, naye insert ----
    await updateModelHelper(
      "salesdetails",
      { delete: 1, updated: new Date() },
      { salesId: id, companyId, delete: 0 },
    );

    for (const line of totals.lines) {
      await saveModel("salesdetails", detailRow(Number(id), companyId, line));
    }
    // ---- Sales GST (naya) ----
    await postInvoiceGst({ req, companyId, fy, body, totals });
    return successResponse(
      res,
      {
        salesId: Number(id),
        salesInvoiceNo: String(body.salesInvoiceNo).trim(),
        grandTotal: totals.grandTotal,
      },
      "Sales Invoice updated successfully",
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This Sales Invoice already exists.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// DELETE SALES
// ============================================================

const deleteSales = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;
    if (!id) return errorResponse(res, "Sales id is required.");

    const existing = await selectWithJoins(
      "sales",
      [],
      { salesId: id, companyId, delete: 0 },
      ["salesId", "salesInvoiceNo"],
    );
    if (!existing.length) return requiredmessage(res, "Sales Invoice not found.");

    await updateModelHelper(
      "sales",
      { delete: 1, updated: new Date() },
      { salesId: id, companyId },
    );

    await updateModelHelper(
      "salesdetails",
      { delete: 1, updated: new Date() },
      { salesId: id, companyId },
    );
    await reverseSalesGst(companyId, existing[0].salesInvoiceNo);
    return successResponse(
      res,
      { salesId: Number(id), salesInvoiceNo: existing[0].salesInvoiceNo },
      "Sales Invoice deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getNextSalesInvoiceNo,
  createSales,
  getSalesList,
  getSalesById,
  updateSales,
  deleteSales,
};