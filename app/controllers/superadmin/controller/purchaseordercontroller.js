const {
  successResponse, errorResponse, requiredmessage,
  saveModel, selectWithJoins, selectWithJoinsV2,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

// ---------------- GET NEXT PO NUMBER (purchase ki tarah hi generate) ----------------
const getNextPoNumber = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found in session. Please select a company year.");

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId, financialYearId,
      tableName: "purchaseorder", idColumn: "purchaseOrderId", fixedPrefix: "PO",
    });

    return successResponse(res, { poNumber: billNo, fyLabel, financialYearId }, "PO number generated successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- ITEM SELECT KARNE PAR: is item ki supplier-wise purchase history ----------------
const getItemSupplierInfo = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId } = req.params;
    if (!itemId) return errorResponse(res, "Item id is required.");

    // ---- purchase (bill) history se: is item ko jitne suppliers se kharida he wo sab, latest-first ----
    const rows = await selectWithJoinsV2(
      "purchasedetails",
      [
        { table: "purchase", alias: "p", onClause: { 'p."purchaseId"': { "=": 'purchasedetails."purchaseId"' } } },
        { table: "account", alias: "a", onClause: { "a.id": { "=": 'p."accountId"' } } },
      ],
      {
        'purchasedetails."itemId"': itemId,
        'purchasedetails."companyId"': companyId,
        'purchasedetails."delete"': 0,
        'p."delete"': 0,
      },
      [
        'a.id AS "supplierId"',
        'a."accountName" AS "supplierName"',
        "purchasedetails.rate AS \"rate\"",
        "purchasedetails.qty AS \"qty\"",
        'p."purchaseDate" AS "purchaseDate"',
        'p."purchaseBillNo" AS "purchaseBillNo"',
        'p."purchaseId" AS "purchaseId"',
      ],
      [['p."purchaseId"', "DESC"]],
      0, 0
    );

    // ---- har supplier ka sirf LAST (latest) purchase record — rows already DESC he, isliye pehla match hi rakho ----
    const seen = new Set();
    const supplierRows = [];
    rows.forEach((row) => {
      if (!seen.has(row.supplierId)) {
        seen.add(row.supplierId);
        supplierRows.push(row);
      }
    });

    // ---- lowest rate wala supplier sabse upar => Recommended ----
    supplierRows.sort((x, y) => Number(x.rate) - Number(y.rate));

    // ---- koi purchase history nahi mili to itemmaster se fallback rate ----
    let fallback = null;
    if (supplierRows.length === 0) {
      const itemRows = await selectWithJoins(
        "itemmaster", [], { itemId, companyId, delete: 0 }, ["purchasePrice", "taxSlab", "unit", "hsnCode"]
      );
      if (itemRows.length > 0) fallback = itemRows[0];
    }

    return successResponse(
      res,
      {
        suppliers: supplierRows,       // lowest-rate-first, sorted
        lastPurchase: rows[0] || null, // is item ki sabse recent purchase (kisi bhi supplier se)
        fallback,
      },
      "Item supplier info fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- CREATE PURCHASE ORDER (Save Draft / Generate PO) ----------------
const createPurchaseOrder = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.body;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found in session. Please select a company year.");

    const {
      poNumber, poDate, requiredDate, branchId, narration,
      discountAmount, roundAmount, status, items,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Please add at least one item.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- poNumber uniqueness — company + FY wise ----
    const dupCheck = await selectWithJoins(
      "purchaseorder", [], { companyId, financialYearId: fy.financialYearId, poNumber, delete: 0 }, ["purchaseOrderId"]
    );
    if (dupCheck.length > 0) {
      return errorResponse(res, "This PO Number already exists for this financial year.");
    }

    let taxableValue = 0;
    let totalGst = 0;
    const cleanItems = [];

    for (const row of items) {
      if (!row.itemId) return errorResponse(res, `Item id missing for "${row.itemName || "an item"}".`);
      if (!row.qty || row.qty <= 0) return errorResponse(res, `Invalid quantity for "${row.itemName}".`);

      const itemRows = await selectWithJoins("itemmaster", [], { itemId: row.itemId, companyId, delete: 0 }, ["itemId"]);
      if (itemRows.length === 0) return errorResponse(res, `Item "${row.itemName}" not found or invalid.`);

      if (row.supplierId) {
        const supRows = await selectWithJoins("account", [], { id: row.supplierId, companyId, delete: 0 }, ["id"]);
        if (supRows.length === 0) return errorResponse(res, `Selected supplier for "${row.itemName}" is invalid.`);
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
        supplierId: row.supplierId || null,
        itemCode: row.itemCode || "",
        itemName: row.itemName,
        hsnCode: row.hsnCode || "",
        uom: row.uom || "",
        qty, rate, discount, taxable, gstPct, gstAmt, total,
      });
    }

    const grandTotal = taxableValue + totalGst - (Number(discountAmount) || 0) + (Number(roundAmount) || 0);
    const finalStatus = status === "Generated" ? "Generated" : "Draft";

    const po = await saveModel("purchaseorder", {
      companyId,
      financialYearId: fy.financialYearId,
      poNumber, poDate, requiredDate: requiredDate || null,
      branchId: branchId || null,
      narration: narration || "",
      taxableValue: Number(taxableValue.toFixed(2)),
      gstAmount: Number(totalGst.toFixed(2)),
      discountAmount: Number(discountAmount) || 0,
      roundAmount: Number(roundAmount) || 0,
      grandTotal: Number(grandTotal.toFixed(2)),
      status: finalStatus,
      delete: 0,
    });

    for (const row of cleanItems) {
      await saveModel("purchaseorderdetails", {
        purchaseOrderId: po.purchaseOrderId,
        companyId,
        ...row,
        delete: 0,
      });
    }

    return successResponse(
      res,
      { purchaseOrderId: po.purchaseOrderId, status: finalStatus, grandTotal },
      `Purchase order ${finalStatus === "Draft" ? "saved as draft" : "generated"} successfully`
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This PO Number already exists for this financial year.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST (dynamic — table me supplier names bhi group hoke aayenge) ----------------
const getPurchaseOrderList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const pos = await selectWithJoins(
      "purchaseorder", [], where,
      ["purchaseOrderId", "poNumber", "poDate", "branchId", "taxableValue", "gstAmount", "grandTotal", "status"]
    );
    if (!pos.length) return successResponse(res, [], "Purchase order list fetched successfully");

    const poIds = pos.map((p) => p.purchaseOrderId);
    const details = await selectWithJoins(
      "purchaseorderdetails", [], { purchaseOrderId: poIds, companyId, delete: 0 }, ["purchaseOrderId", "supplierId"]
    );

    const branchIds = [...new Set(pos.map((p) => p.branchId).filter(Boolean))];
    let branchMap = {};
    if (branchIds.length) {
      try {
        const branches = await selectWithJoins("branch", [], { branchId: branchIds, companyId, delete: 0 }, ["branchId", "branchName"]);
        branches.forEach((b) => { branchMap[b.branchId] = b; });
      } catch (e) { branchMap = {}; }
    }

    const supplierIds = [...new Set(details.map((d) => d.supplierId).filter(Boolean))];
    let accountMap = {};
    if (supplierIds.length) {
      const accounts = await selectWithJoins("account", [], { id: supplierIds, companyId, delete: 0 }, ["id", "accountName"]);
      accounts.forEach((a) => { accountMap[a.id] = a; });
    }

    const supplierNamesByPo = {};
    details.forEach((d) => {
      if (!d.supplierId || !accountMap[d.supplierId]) return;
      if (!supplierNamesByPo[d.purchaseOrderId]) supplierNamesByPo[d.purchaseOrderId] = new Set();
      supplierNamesByPo[d.purchaseOrderId].add(accountMap[d.supplierId].accountName);
    });

    const data = pos.map((p) => {
      const names = supplierNamesByPo[p.purchaseOrderId];
      const supplierName = names ? [...names].join(", ") : "";
      const branch = branchMap[p.branchId] || {};
      return {
        id: String(p.purchaseOrderId),
        poNumber: p.poNumber,
        poDate: p.poDate,
        supplierName,
        deliveryLocation: branch.branchName || "Main Branch",
        totalAmount: String(p.grandTotal),
        status: p.status,
      };
    });

    return successResponse(res, data, "Purchase order list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (view/edit ke liye) ----------------
const getPurchaseOrderById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    const { id } = req.params;

    const rows = await selectWithJoins(
      "purchaseorder", [], { purchaseOrderId: id, companyId, delete: 0 },
      ["purchaseOrderId", "poNumber", "poDate", "requiredDate", "branchId", "narration",
        "taxableValue", "gstAmount", "discountAmount", "roundAmount", "grandTotal", "status"]
    );
    if (rows.length === 0) return requiredmessage(res, "Purchase order not found");

    const items = await selectWithJoins(
      "purchaseorderdetails", [], { purchaseOrderId: id, companyId, delete: 0 },
      ["purchaseOrderDetailsId", "itemId", "supplierId", "itemCode", "itemName", "hsnCode", "uom",
        "qty", "rate", "discount", "taxable", "gstPct", "gstAmt", "total"]
    );

    return successResponse(res, { ...rows[0], items }, "Purchase order fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getNextPoNumber, getItemSupplierInfo,
  createPurchaseOrder, getPurchaseOrderList, getPurchaseOrderById,
};