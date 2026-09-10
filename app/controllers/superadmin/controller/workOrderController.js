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

// ============================================================
// HELPERS
// ============================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

// ============================================================
// GET NEXT WORK ORDER NO
// ============================================================

const getNextWorkOrderNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found. Please select a company year.");

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
        tableName: "workorder",
        idColumn: "workOrderId",
        prefixFor: "WORK ORDER",
      });

      const existing = await selectWithJoins(
        "workorder",
        [],
        { companyId, financialYearId: fy.financialYearId, workOrderNo: result.billNo, delete: 0 },
        ["workOrderId"],
      );

      if (existing.length === 0) {
        billNo = result.billNo;
        fyLabel = result.fyLabel;
        break;
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    if (!billNo) {
      return errorResponse(res, "Could not generate a unique Work Order number. Please try again.");
    }

    return successResponse(
      res,
      { workOrderNo: billNo, fyLabel, financialYearId: fy.financialYearId },
      "Work Order number generated successfully",
    );
  } catch (error) {
    console.error("getNextWorkOrderNo error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// CREATE WORK ORDER
// ============================================================

const createWorkOrder = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      financialYearId,
      workOrderNo,
      salesOrderId,

      customerName,
      mobile,
      email,
      address,
      city,
      model,

      qty,
      totalPrice,
      gst,
      grandTotal,

      createdBy,
      createdType,
    } = req.body;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!financialYearId) {
      return errorResponse(res, "Financial Year not found. Please select a company year.");
    }

    if (!normalizeId(salesOrderId)) {
      return errorResponse(res, "Please select a Sales Order.");
    }

    if (!customerName || !String(customerName).trim()) {
      return errorResponse(res, "Customer name is required.");
    }

    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, "Client number is required.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    // ========================================================
    // CHECK SALES ORDER EXISTS
    // ========================================================

    const salesOrderRows = await selectWithJoins(
      "salesorder",
      [],
      { salesOrderId, companyId, delete: 0 },
      ["salesOrderId", "soNo"],
    );

    if (!salesOrderRows.length) {
      return errorResponse(res, "Selected Sales Order was not found.");
    }

    // ========================================================
    // CHECK DUPLICATE WORK ORDER FOR SALES ORDER
    // ========================================================

    const duplicate = await selectWithJoins(
      "workorder",
      [],
      { companyId, salesOrderId, delete: 0 },
      ["workOrderId", "workOrderNo"],
    );

    if (duplicate.length > 0) {
      return errorResponse(
        res,
        `Work Order already exists for this Sales Order (${duplicate[0].workOrderNo}).`,
      );
    }

    // ========================================================
    // QTY / AMOUNTS
    // ========================================================

    const finalQty = Number(qty) || 0;

    if (finalQty <= 0) {
      return errorResponse(res, "Quantity must be greater than 0.");
    }

    const finalTotalPrice = round2(totalPrice);
    const finalGst = round2(gst);
    const finalGrandTotal = round2(grandTotal);

    // ========================================================
    // WORK ORDER NUMBER
    // ========================================================

    let finalWorkOrderNo = workOrderNo;

    if (!finalWorkOrderNo) {
      const { billNo } = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "workorder",
        idColumn: "workOrderId",
        prefixFor: "WORK ORDER",
      });

      finalWorkOrderNo = billNo;
    }

    const duplicateNo = await selectWithJoins(
      "workorder",
      [],
      { companyId, financialYearId: fy.financialYearId, workOrderNo: finalWorkOrderNo, delete: 0 },
      ["workOrderId"],
    );

    if (duplicateNo.length > 0) {
      return errorResponse(res, "This Work Order No already exists.");
    }

    // ========================================================
    // SAVE
    // ========================================================

    const workOrder = await saveModel("workorder", {
      companyId,
      financialYearId: fy.financialYearId,

      workOrderNo: finalWorkOrderNo,

      salesOrderId,

      customerName: String(customerName).trim(),
      mobile: String(mobile).trim(),
      email: email || null,
      address: address || null,
      city: city || null,
      model: model || null,

      qty: finalQty,
      totalPrice: finalTotalPrice,
      gst: finalGst,
      grandTotal: finalGrandTotal,

      createdBy: req.employeeId ? String(req.employeeId) : createdBy || null,
      createdtype: req.employeeId ? "Sale Executive" : createdType || null,

      delete: 0,
    });

    return successResponse(
      res,
      {
        workOrderId: workOrder.workOrderId,
        workOrderNo: finalWorkOrderNo,
        salesOrderId,

        customerName,
        mobile,
        email: email || "",
        address: address || "",
        city: city || "",
        model: model || "",

        qty: finalQty,
        totalPrice: finalTotalPrice,
        gst: finalGst,
        grandTotal: finalGrandTotal,
      },
      "Work Order generated successfully",
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This Work Order already exists.");
    }

    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET WORK ORDER LIST
// ============================================================

const getWorkOrderList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { financialYearId } = req.query;

    const workOrderWhere = {
      companyId,
      delete: 0,
    };

    if (financialYearId) {
      workOrderWhere.financialYearId = financialYearId;
    }

    const workOrders = await selectWithJoins(
      "workorder",
      [],
      workOrderWhere,
      [
        "workOrderId",
        "companyId",
        "financialYearId",

        "workOrderNo",
        "salesOrderId",

        "customerName",
        "mobile",
        "email",
        "address",
        "city",
        "model",

        "qty",
        "totalPrice",
        "gst",
        "grandTotal",

        "createdBy",
        "createdtype",

        "created",
        "updated",
      ],
      [["workOrderId", "DESC"]],
    );

    if (!workOrders.length) {
      return successResponse(res, [], "Work Order list fetched successfully");
    }

    const data = workOrders.map((workOrder) => ({
      id: String(workOrder.workOrderId),

      financialYearId: workOrder.financialYearId,

      workOrderNo: workOrder.workOrderNo || "",
      salesOrderId: workOrder.salesOrderId,

      customerName: workOrder.customerName || "",
      mobile: workOrder.mobile || "",
      email: workOrder.email || "",
      address: workOrder.address || "",
      city: workOrder.city || "",
      model: workOrder.model || "",

      qty: Number(workOrder.qty) || 0,
      totalPrice: Number(workOrder.totalPrice) || 0,
      gst: Number(workOrder.gst) || 0,
      grandTotal: Number(workOrder.grandTotal) || 0,

      createdBy: workOrder.createdBy || "",
      createdType: workOrder.createdtype || "",

      createdAt: workOrder.created,
      updatedAt: workOrder.updated,
    }));

    return successResponse(res, data, "Work Order list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET WORK ORDER BY ID
// ============================================================

const getWorkOrderById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Work Order id is required.");
    }

    const rows = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: id, companyId, delete: 0 },
      [
        "workOrderId",
        "financialYearId",

        "workOrderNo",
        "salesOrderId",

        "customerName",
        "mobile",
        "email",
        "address",
        "city",
        "model",

        "qty",
        "totalPrice",
        "gst",
        "grandTotal",

        "createdBy",
        "createdtype",

        "created",
        "updated",
      ],
    );

    if (!rows.length) {
      return requiredmessage(res, "Work Order not found.");
    }

    const workOrder = rows[0];

    return successResponse(
      res,
      {
        id: String(workOrder.workOrderId),

        financialYearId: workOrder.financialYearId,

        workOrderNo: workOrder.workOrderNo || "",
        salesOrderId: workOrder.salesOrderId,

        customerName: workOrder.customerName || "",
        mobile: workOrder.mobile || "",
        email: workOrder.email || "",
        address: workOrder.address || "",
        city: workOrder.city || "",
        model: workOrder.model || "",

        qty: Number(workOrder.qty) || 0,
        totalPrice: Number(workOrder.totalPrice) || 0,
        gst: Number(workOrder.gst) || 0,
        grandTotal: Number(workOrder.grandTotal) || 0,

        createdBy: workOrder.createdBy || "",
        createdType: workOrder.createdtype || "",

        createdAt: workOrder.created,
        updatedAt: workOrder.updated,
      },
      "Work Order fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// UPDATE WORK ORDER
// ============================================================

const updateWorkOrder = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Work Order id is required.");
    }

    const existingRows = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: id, companyId, delete: 0 },
      ["workOrderId", "financialYearId", "workOrderNo", "salesOrderId"],
    );

    if (!existingRows.length) {
      return requiredmessage(res, "Work Order not found.");
    }

    const existing = existingRows[0];

    const {
      financialYearId,
      salesOrderId,

      customerName,
      mobile,
      email,
      address,
      city,
      model,

      qty,
      totalPrice,
      gst,
      grandTotal,

      createdBy,
      createdType,
    } = req.body;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!financialYearId) {
      return errorResponse(res, "Financial Year not found. Please select a company year.");
    }

    if (!normalizeId(salesOrderId)) {
      return errorResponse(res, "Please select a Sales Order.");
    }

    if (!customerName || !String(customerName).trim()) {
      return errorResponse(res, "Customer name is required.");
    }

    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, "Client number is required.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    const finalQty = Number(qty) || 0;

    if (finalQty <= 0) {
      return errorResponse(res, "Quantity must be greater than 0.");
    }

    const finalTotalPrice = round2(totalPrice);
    const finalGst = round2(gst);
    const finalGrandTotal = round2(grandTotal);

    // ========================================================
    // UPDATE
    // ========================================================

    await updateModelHelper(
      "workorder",
      {
        financialYearId: fy.financialYearId,
        salesOrderId,

        customerName: String(customerName).trim(),
        mobile: String(mobile).trim(),
        email: email || null,
        address: address || null,
        city: city || null,
        model: model || null,

        qty: finalQty,
        totalPrice: finalTotalPrice,
        gst: finalGst,
        grandTotal: finalGrandTotal,

        createdBy: req.employeeId ? String(req.employeeId) : createdBy || null,
        createdtype: req.employeeId ? "Sale Executive" : createdType || null,

        updated: new Date(),
      },
      { workOrderId: id, companyId, delete: 0 },
    );

    return successResponse(
      res,
      {
        workOrderId: Number(id),
        workOrderNo: existing.workOrderNo,
        salesOrderId,

        customerName,
        mobile,
        email: email || "",
        address: address || "",
        city: city || "",
        model: model || "",

        qty: finalQty,
        totalPrice: finalTotalPrice,
        gst: finalGst,
        grandTotal: finalGrandTotal,
      },
      "Work Order updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// DELETE WORK ORDER
// ============================================================

const deleteWorkOrder = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Work Order id is required.");
    }

    const existing = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: id, companyId, delete: 0 },
      ["workOrderId", "workOrderNo"],
    );

    if (!existing.length) {
      return requiredmessage(res, "Work Order not found.");
    }

    await updateModelHelper(
      "workorder",
      { delete: 1, updated: new Date() },
      { workOrderId: id, companyId },
    );

    return successResponse(
      res,
      { workOrderId: Number(id), workOrderNo: existing[0].workOrderNo },
      "Work Order deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getNextWorkOrderNo,
  createWorkOrder,
  getWorkOrderList,
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
};