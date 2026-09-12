const {
  successResponse,
  errorResponse,
  requiredmessage,
  selectWithJoins,
} = require("../../../helper/index.js");

const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

const db = require("../../../modelses");
const Indent = db.indent;
const IndentItem = db.indentitem;
const sequelize = db.sequelize;

// ---------------- GET NEXT INDENT NO (preview, not required by createIndent) ----------------
const getNextIndentNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found. Please select a company year.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "indent",
      idColumn: "indentId",
      prefixFor: "INDENT",
    });

    return successResponse(
      res,
      { indentNo: billNo, fyLabel, financialYearId: fy.financialYearId },
      "Indent number generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CHECK IF AN INDENT ALREADY EXISTS FOR A WORK ORDER ----------------
// Material Availability calls this on load to decide: show "Save" or
// "Indent Already Generated" (disabled).
const checkIndentForWorkOrder = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { workOrderId } = req.params;
    if (!workOrderId) return errorResponse(res, "Work Order id is required.");

    const rows = await selectWithJoins(
      "indent",
      [],
      { workOrderId, companyId, delete: 0 },
      ["indentId", "indentNo", "created"],
    );

    if (rows.length === 0) {
      return successResponse(res, { exists: false }, "No indent found for this work order");
    }

    return successResponse(
      res,
      { exists: true, indent: rows[0] },
      "Indent already exists for this work order",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE INDENT (save once per Work Order) ----------------
const createIndent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const companyId = req.companyId;

    if (!companyId) {
      await t.rollback();
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { financialYearId, workOrderId, modelItemId, modelName, items } = req.body;

    if (!financialYearId) {
      await t.rollback();
      return errorResponse(res, "Financial Year not found. Please select a company year.");
    }
    if (!workOrderId) {
      await t.rollback();
      return errorResponse(res, "Work Order is required.");
    }
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return errorResponse(res, "No material availability rows to save.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) {
      await t.rollback();
      return errorResponse(res, "Invalid Financial Year.");
    }

    // ---- work order must exist and belong to this company ----
    const woRows = await selectWithJoins(
      "workorder",
      [],
      { workOrderId, companyId, delete: 0 },
      ["workOrderId", "workOrderNo"],
    );
    if (woRows.length === 0) {
      await t.rollback();
      return errorResponse(res, "Selected Work Order was not found.");
    }

    // ---- save-once rule: reject if an indent already exists for this Work Order ----
    const existing = await selectWithJoins(
      "indent",
      [],
      { workOrderId, companyId, delete: 0 },
      ["indentId", "indentNo"],
    );
    if (existing.length > 0) {
      await t.rollback();
      return errorResponse(res, `Indent already generated for this Work Order (${existing[0].indentNo}).`);
    }

    // ---- indent number, same voucher-style numbering as Work Order / PO ----
    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "indent",
      idColumn: "indentId",
      prefixFor: "INDENT",
    });

    const indent = await Indent.create(
      {
        companyId,
        financialYearId: fy.financialYearId,
        indentNo: billNo,
        workOrderId,
        modelItemId: modelItemId || null,
        modelName: modelName || null,
        status: "Generated",
        createdBy: req.employeeId ? String(req.employeeId) : null,
        delete: 0,
      },
      { transaction: t },
    );

    for (const row of items) {
      await IndentItem.create(
        {
          indentId: indent.indentId,
          companyId,
          bomItemId: row.bomItemId || null,
          itemId: row.itemId || null,
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemLocation: row.itemLocation || "",
          category: row.category || "",
          unit: row.unit || "",
          availableStock: Number(row.availableStock) || 0,
          requiredStock: Number(row.requiredStock) || 0,
          purchaseRequired: Number(row.purchaseRequired) || 0,
        },
        { transaction: t },
      );
    }

    await t.commit();
    return successResponse(
      res,
      { indentId: indent.indentId, indentNo: billNo },
      "Indent generated successfully",
    );
  } catch (error) {
    await t.rollback();
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Indent already generated for this Work Order.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (feeds the Indent page) ----------------
const getIndentList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const indents = await selectWithJoins(
      "indent",
      [],
      where,
      ["indentId", "indentNo", "workOrderId", "modelName", "created"],
      [["indentId", "DESC"]],
    );
    if (!indents.length) return successResponse(res, [], "Indent list fetched successfully");

    const workOrderIds = [...new Set(indents.map((i) => i.workOrderId))];
    const workOrders = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: workOrderIds, companyId, delete: 0 },
      ["workOrderId", "workOrderNo"],
    );
    const woMap = new Map(workOrders.map((w) => [w.workOrderId, w.workOrderNo]));

    const data = indents.map((i) => ({
      id: String(i.indentId),
      indentNo: i.indentNo,
      workOrderId: i.workOrderId,
      workOrderNo: woMap.get(i.workOrderId) || "",
      modelName: i.modelName || "",
      date: i.created,
    }));

    return successResponse(res, data, "Indent list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (view — header + full items table) ----------------
const getIndentById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const rows = await selectWithJoins(
      "indent",
      [],
      { indentId: id, companyId, delete: 0 },
      ["indentId", "indentNo", "workOrderId", "modelName", "status", "created"],
    );
    if (rows.length === 0) return requiredmessage(res, "Indent not found.");

    const items = await selectWithJoins(
      "indentitem",
      [],
      { indentId: id, companyId },
      [
        "indentItemId",
        "itemCode",
        "itemName",
        "itemLocation",
        "category",
        "unit",
        "availableStock",
        "requiredStock",
        "purchaseRequired",
      ],
    );

    const woRows = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: rows[0].workOrderId, companyId, delete: 0 },
      ["workOrderNo"],
    );

    return successResponse(
      res,
      {
        ...rows[0],
        workOrderNo: woRows[0]?.workOrderNo || "",
        items,
      },
      "Indent fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getNextIndentNo,
  checkIndentForWorkOrder,
  createIndent,
  getIndentList,
  getIndentById,
};