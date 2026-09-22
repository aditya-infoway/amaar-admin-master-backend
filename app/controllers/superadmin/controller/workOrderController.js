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
const {
  getLeadMap,
  leadDetails,
  getLeadMapBySalesOrder,
} = require("../../../helper/leadDetails.js");
const db = require("../../../modelses");

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

// live customer/model details from the lead, falling back to the stored copy
const liveDetails = (workOrder, lead) =>
  lead
    ? leadDetails(lead)
    : {
      customerName: workOrder.customerName || "",
      mobile: workOrder.mobile || "",
      email: workOrder.email || "",
      address: workOrder.address || "",
      city: workOrder.city || "",
      model: workOrder.model || "",
    };

// ============================================================
// GET NEXT WORK ORDER NO
// ============================================================

const getNextWorkOrderNo = async (req, res) => {
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
        tableName: "workorder",
        idColumn: "workOrderId",
        prefixFor: "WORK ORDER",
      });

      const existing = await selectWithJoins(
        "workorder",
        [],
        {
          companyId,
          financialYearId: fy.financialYearId,
          workOrderNo: result.billNo,
          delete: 0,
        },
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
      return errorResponse(
        res,
        "Could not generate a unique Work Order number. Please try again.",
      );
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
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );
    }

    if (!normalizeId(salesOrderId)) {
      return errorResponse(res, "Please select a Sales Order.");
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
      ["salesOrderId", "soNo", "leadId"],
    );

    if (!salesOrderRows.length) {
      return errorResponse(res, "Selected Sales Order was not found.");
    }

    const leadMap = await getLeadMap([salesOrderRows[0].leadId], companyId);
    const lead = leadMap.get(String(salesOrderRows[0].leadId));
    if (!lead) {
      return errorResponse(
        res,
        "Lead for the selected Sales Order was not found.",
      );
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
      {
        companyId,
        financialYearId: fy.financialYearId,
        workOrderNo: finalWorkOrderNo,
        delete: 0,
      },
      ["workOrderId"],
    );

    if (duplicateNo.length > 0) {
      return errorResponse(res, "This Work Order No already exists.");
    }

    // ========================================================
    // CHECK MODEL (PRODUCT) BELONGS TO THIS COMPANY
    // ========================================================

    if (lead.model) {
      const modelRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: normalizeId(lead.model), companyId, delete: 0 },
        ["itemId"],
      );

      if (!modelRows.length) {
        return errorResponse(
          res,
          "Selected product was not found for this company.",
        );
      }
    }

    // ========================================================
    // SAVE
    // ========================================================

    const workOrder = await saveModel("workorder", {
      companyId,
      financialYearId: fy.financialYearId,

      workOrderNo: finalWorkOrderNo,

      salesOrderId,

      customerName: lead.name,
      mobile: lead.number,
      email: lead.email || null,
      address: lead.address || null,
      city: lead.city || null,
      model: lead.model ? String(lead.model) : null,

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

        ...leadDetails(lead),

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
        "assignedEmployeeId",

        "created",
        "updated",
      ],
      [["workOrderId", "DESC"]],
    );

    if (!workOrders.length) {
      return successResponse(res, [], "Work Order list fetched successfully");
    }

    // ========================================================
    // GET SALES ORDER NUMBERS
    // ========================================================

    const salesOrderIds = workOrders
      .map((item) => item.salesOrderId)
      .filter((id) => id);

    let salesOrderMap = {};

    if (salesOrderIds.length > 0) {
      try {
        const salesOrders = await selectWithJoins(
          "salesorder",
          [],
          { salesOrderId: salesOrderIds, companyId, delete: 0 },
          ["salesOrderId", "soNo"],
        );

        salesOrderMap = salesOrders.reduce((map, so) => {
          map[String(so.salesOrderId)] = so.soNo || "";
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching sales orders:", err.message);
      }
    }

    // ========================================================
    // GET MODEL NAMES
    // ========================================================

    const leadBySalesOrder = await getLeadMapBySalesOrder(
      workOrders.map((item) => item.salesOrderId),
      companyId,
    );

    const modelIds = [
      ...new Set(
        [
          ...[...leadBySalesOrder.values()].map((l) => l?.model),
          ...workOrders.map((item) => item.model),
        ].filter(Boolean),
      ),
    ];

    let modelMap = {};

    if (modelIds.length > 0) {
      try {
        const models = await selectWithJoins(
          "itemmaster",
          [],
          { itemId: modelIds },
          ["itemId", "itemName"],
        );

        modelMap = models.reduce((map, m) => {
          map[String(m.itemId)] = m.itemName || "";
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching models:", err.message);
      }
    }

    const data = workOrders.map((workOrder) => {
      const live = liveDetails(
        workOrder,
        leadBySalesOrder.get(String(workOrder.salesOrderId)),
      );

      return {
        id: String(workOrder.workOrderId),

        financialYearId: workOrder.financialYearId,

        workOrderNo: workOrder.workOrderNo || "",
        salesOrderId: workOrder.salesOrderId,
        salesOrderNo: salesOrderMap[String(workOrder.salesOrderId)] || "",

        customerName: live.customerName,
        mobile: live.mobile,
        email: live.email,
        address: live.address,
        city: live.city,
        model: live.model,
        modelName: modelMap[String(live.model)] || "",

        qty: Number(workOrder.qty) || 0,
        totalPrice: Number(workOrder.totalPrice) || 0,
        gst: Number(workOrder.gst) || 0,
        grandTotal: Number(workOrder.grandTotal) || 0,

        createdBy: workOrder.createdBy || "",
        createdType: workOrder.createdtype || "",
        assignedEmployeeId: workOrder.assignedEmployeeId
          ? String(workOrder.assignedEmployeeId)
          : null,

        createdAt: workOrder.created,
        updatedAt: workOrder.updated,
      };
    });

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

    const leadBySalesOrder = await getLeadMapBySalesOrder(
      [workOrder.salesOrderId],
      companyId,
    );
    const live = liveDetails(
      workOrder,
      leadBySalesOrder.get(String(workOrder.salesOrderId)),
    );

    return successResponse(
      res,
      {
        id: String(workOrder.workOrderId),

        financialYearId: workOrder.financialYearId,

        workOrderNo: workOrder.workOrderNo || "",
        salesOrderId: workOrder.salesOrderId,

        customerName: live.customerName,
        mobile: live.mobile,
        email: live.email,
        address: live.address,
        city: live.city,
        model: live.model,

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
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );
    }

    if (!normalizeId(salesOrderId)) {
      return errorResponse(res, "Please select a Sales Order.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    const salesOrderRows = await selectWithJoins(
      "salesorder",
      [],
      { salesOrderId, companyId, delete: 0 },
      ["salesOrderId", "leadId"],
    );
    if (!salesOrderRows.length) {
      return errorResponse(res, "Selected Sales Order was not found.");
    }

    const leadMap = await getLeadMap([salesOrderRows[0].leadId], companyId);
    const lead = leadMap.get(String(salesOrderRows[0].leadId));
    if (!lead) {
      return errorResponse(
        res,
        "Lead for the selected Sales Order was not found.",
      );
    }

    const duplicate = await selectWithJoins(
      "workorder",
      [],
      { companyId, salesOrderId, delete: 0 },
      ["workOrderId", "workOrderNo"],
    );

    const conflictsWithAnother = duplicate.some(
      (row) => String(row.workOrderId) !== String(id),
    );

    if (conflictsWithAnother) {
      return errorResponse(
        res,
        `Work Order already exists for this Sales Order (${duplicate.find((row) => String(row.workOrderId) !== String(id))
          ?.workOrderNo
        }).`,
      );
    }
    const finalQty = Number(qty) || 0;

    if (finalQty <= 0) {
      return errorResponse(res, "Quantity must be greater than 0.");
    }

    const finalTotalPrice = round2(totalPrice);
    const finalGst = round2(gst);
    const finalGrandTotal = round2(grandTotal);

    // ========================================================
    // CHECK MODEL (PRODUCT) BELONGS TO THIS COMPANY
    // ========================================================

    if (lead.model) {
      const modelRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: normalizeId(lead.model), companyId, delete: 0 },
        ["itemId"],
      );

      if (!modelRows.length) {
        return errorResponse(
          res,
          "Selected product was not found for this company.",
        );
      }
    }

    // ========================================================
    // UPDATE
    // ========================================================

    await updateModelHelper(
      "workorder",
      {
        financialYearId: fy.financialYearId,
        salesOrderId,

        customerName: lead.name,
        mobile: lead.number,
        email: lead.email || null,
        address: lead.address || null,
        city: lead.city || null,
        model: lead.model ? String(lead.model) : null,
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

        ...leadDetails(lead),

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




const assignWorkOrder = async (req, res) => {
  try {
    const { workOrderId, contractorManagerId } = req.body;

    if (!workOrderId) {
      return errorResponse(res, "Work Order ID is required");
    }

    if (!contractorManagerId) {
      return errorResponse(res, "Contractor Manager is required");
    }

    // Check Contractor Manager
    const contractorManager = await selectWithJoins(
      "employee",
      [],
      {
        employeeId: contractorManagerId,
        delete: 0,
        roleId: 18,
      },
      [
        "employeeId",
        "employeeName",
        "department",
        "branch",
        "roleId",
      ],
      [["employeeId", "ASC"]]
    );

    if (!contractorManager || contractorManager.length === 0) {
      return errorResponse(
        res,
        "Contractor Manager not found"
      );
    }

    // Check Work Order
    const workOrderData = await selectWithJoins(
      "workorder",
      [],
      {
        workOrderId: workOrderId,
        delete: 0,
      },
      ["workOrderId"],
      [["workOrderId", "ASC"]]
    );
    if (!workOrderData || workOrderData.length === 0) {
      return errorResponse(
        res,
        "Work Order not found"
      );
    }

  await db.workorder.update(
  {
    assignedEmployeeId: contractorManagerId,
  },
  {
    where: {
      workOrderId: workOrderId,
      delete: 0,
    },
  }
);

    return successResponse(
      res,
      {
        workOrderId,
        contractorManagerId,
      },
      "Work Order assigned successfully"
    );
  } catch (error) {
    console.error("Assign Work Order error:", error);

    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
  }
};


module.exports = {
  getNextWorkOrderNo,
  createWorkOrder,
  getWorkOrderList,
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
  assignWorkOrder,
};
