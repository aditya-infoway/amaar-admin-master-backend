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
const { WORK_ORDER_STAGES } = require("../../../helper/workOrderStages.js");
const {
  MATERIAL_STATUS,
  getMaterialStatusMap,
} = require("../../../helper/workOrderMaterialStatus.js");
const { getStageItems } = require("../../../helper/workOrderStageItems.js");


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

// Validates { CUTTING: 12, WELDING: 15, ... } -> { rows } or { error }
const validateStageAssignments = async (stages, companyId) => {
  const input = stages && typeof stages === "object" ? stages : {};
  const rows = [];

  for (const s of WORK_ORDER_STAGES) {
    const employeeId = normalizeId(input[s.key]);
    if (!employeeId) {
      return { error: `Please select an employee for ${s.label}.` };
    }
    rows.push({
      stage: s.key,
      stageOrder: s.order,
      employeeId,
      roleId: s.roleId,
      label: s.label,
    });
  }

  const employees = await selectWithJoins(
    "employee",
    [],
    { employeeId: rows.map((r) => r.employeeId), companyId, delete: 0 },
    ["employeeId", "roleId"],
  );
  const roleById = new Map(
    employees.map((e) => [String(e.employeeId), Number(e.roleId)]),
  );

  for (const r of rows) {
    if (roleById.get(String(r.employeeId)) !== r.roleId) {
      return { error: `Selected employee is not valid for ${r.label}.` };
    }
  }

  return { rows };
};

// Map<workOrderId, stage[]> with employee names + mobile, ordered by stageOrder
const getStageMap = async (workOrderIds) => {
  const map = new Map();
  const ids = [...new Set((workOrderIds || []).filter(Boolean))];
  if (!ids.length) return map;

  const rows = await selectWithJoins(
    "workorderstage",
    [],
    { workOrderId: ids, delete: 0 },
    [
      "workOrderId",
      "stage",
      "stageOrder",
      "employeeId",
      "status",
      "completedAt",
      "startTime",
      "endTime",
      "created",
    ],
    [["stageOrder", "ASC"]],
  );
  if (!rows.length) return map;

  const employeeIds = [...new Set(rows.map((r) => r.employeeId))];

  const employees = await selectWithJoins(
    "employee",
    [],
    { employeeId: employeeIds },
    ["employeeId", "employeeName", "mobileNumber"],
  );
  const empById = new Map(employees.map((e) => [String(e.employeeId), e]));
  const labelByKey = new Map(WORK_ORDER_STAGES.map((s) => [s.key, s.label]));

  rows.forEach((r) => {
    const key = String(r.workOrderId);
    if (!map.has(key)) map.set(key, []);
    const emp = empById.get(String(r.employeeId)) || {};
    map.get(key).push({
      stage: r.stage,
      label: labelByKey.get(r.stage) || r.stage,
      order: r.stageOrder,
      employeeId: String(r.employeeId),
      employeeName: emp.employeeName || "",
      mobileNumber: emp.mobileNumber || "",
      status: r.status,
      assignedAt: r.created,
      startTime: r.startTime,
      endTime: r.endTime,
      completedAt: r.completedAt,
    });
  });

  return map;
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

      stages,
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

    const stageCheck = await validateStageAssignments(stages, companyId);
    if (stageCheck.error) {
      return errorResponse(res, stageCheck.error);
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

    try {
      await db.workorderstage.bulkCreate(
        stageCheck.rows.map((r) => ({
          companyId,
          workOrderId: workOrder.workOrderId,
          stage: r.stage,
          stageOrder: r.stageOrder,
          employeeId: r.employeeId,
          status: "Pending",
          delete: 0,
        })),
      );
    } catch (stageError) {
      await updateModelHelper(
        "workorder",
        { delete: 1, updated: new Date() },
        { workOrderId: workOrder.workOrderId, companyId },
      );
      throw stageError;
    }

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

    const stageMap = await getStageMap(workOrders.map((w) => w.workOrderId));

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
        stages: stageMap.get(String(workOrder.workOrderId)) || [],
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

    const stageMap = await getStageMap([workOrder.workOrderId]);

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
        stages: stageMap.get(String(workOrder.workOrderId)) || [],

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
        `Work Order already exists for this Sales Order (${
          duplicate.find((row) => String(row.workOrderId) !== String(id))
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
      ["employeeId", "employeeName", "department", "branch", "roleId"],
      [["employeeId", "ASC"]],
    );

    if (!contractorManager || contractorManager.length === 0) {
      return errorResponse(res, "Contractor Manager not found");
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
      [["workOrderId", "ASC"]],
    );
    if (!workOrderData || workOrderData.length === 0) {
      return errorResponse(res, "Work Order not found");
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
      },
    );

    return successResponse(
      res,
      {
        workOrderId,
        contractorManagerId,
      },
      "Work Order assigned successfully",
    );
  } catch (error) {
    console.error("Assign Work Order error:", error);

    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getStageEmployees = async (req, res) => {
  try {
    if (!req.companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const employees = await selectWithJoins(
      "employee",
      [],
      {
        companyId: req.companyId,
        roleId: WORK_ORDER_STAGES.map((s) => s.roleId),
        delete: 0,
      },
      ["employeeId", "employeeName", "roleId"],
      [["employeeName", "ASC"]],
    );

    const data = WORK_ORDER_STAGES.map((s) => ({
      key: s.key,
      label: s.label,
      order: s.order,
      employees: employees
        .filter((e) => Number(e.roleId) === s.roleId)
        .map((e) => ({ id: Number(e.employeeId), name: e.employeeName || "" })),
    }));

    return successResponse(res, data, "Stage employees fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getMyWorkOrderTasks = async (req, res) => {
  try {
    const { companyId, employeeId } = req;
    const { status } = req.query;
    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const mine = await selectWithJoins(
      "workorderstage",
      [],
      { companyId, employeeId, delete: 0, ...(status ? { status } : {}) },
      [
        "workOrderStageId",
        "workOrderId",
        "stage",
        "stageOrder",
        "status",
        "completedAt",
        "startTime",
        "endTime",
        "itemsVerified",
      ],
      [["workOrderStageId", "DESC"]],
    );
    if (!mine.length) return successResponse(res, [], "No tasks assigned");

    const workOrderIds = [...new Set(mine.map((m) => m.workOrderId))];

    const [allStages, workOrders] = await Promise.all([
      selectWithJoins(
        "workorderstage",
        [],
        { workOrderId: workOrderIds, delete: 0 },
        ["workOrderId", "stage", "stageOrder", "status"],
      ),
      selectWithJoins(
        "workorder",
        [],
        { workOrderId: workOrderIds, companyId, delete: 0 },
        [
          "workOrderId",
          "workOrderNo",
          "customerName",
          "model",
          "qty",
          "created",
        ],
      ),
    ]);

    const woById = new Map(workOrders.map((w) => [String(w.workOrderId), w]));
    const materialStatusMap = await getMaterialStatusMap(
      workOrderIds,
      companyId,
    );
    const labelByKey = new Map(WORK_ORDER_STAGES.map((s) => [s.key, s.label]));

    const stagesByWo = new Map();
    allStages.forEach((s) => {
      const key = String(s.workOrderId);
      if (!stagesByWo.has(key)) stagesByWo.set(key, []);
      stagesByWo.get(key).push(s);
    });

    const data = mine
      .filter((m) => woById.has(String(m.workOrderId)))
      .map((m) => {
        const wo = woById.get(String(m.workOrderId));
        const siblings = stagesByWo.get(String(m.workOrderId)) || [];

        const isUnlocked = !siblings.some(
          (s) => s.stageOrder < m.stageOrder && s.status !== "Completed",
        );

        const previous = siblings
          .filter((s) => s.stageOrder < m.stageOrder)
          .sort((a, b) => b.stageOrder - a.stageOrder)[0];

        let stageProgressStatus = null;
        if (previous) {
          const prevLabel = labelByKey.get(previous.stage) || previous.stage;
          stageProgressStatus =
            previous.status === "Completed"
              ? `${prevLabel} Complete`.trim()
              : `Pending ${prevLabel}`.trim();
        }

        return {
          workOrderStageId: m.workOrderStageId,
          workOrderId: m.workOrderId,
          workOrderNo: wo.workOrderNo,
          workOrderDate: wo.created,
          materialStatus:
            materialStatusMap.get(String(m.workOrderId)) ||
            MATERIAL_STATUS.PENDING_MATERIAL,
          stageProgressStatus,
          customerName: wo.customerName,
          model: wo.model,
          qty: wo.qty,
          stage: m.stage,
          stageLabel: labelByKey.get(m.stage) || m.stage,
          stageOrder: m.stageOrder,
          status: m.status,
          isUnlocked,
          completedAt: m.completedAt,
          startTime: m.startTime,
          endTime: m.endTime,
          itemsVerified: Boolean(m.itemsVerified),
        };
      });

    return successResponse(res, data, "Tasks fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const updateWorkOrderStages = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;
    const { stages } = req.body;

    const existing = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: id, companyId, delete: 0 },
      ["workOrderId"],
    );
    if (!existing.length) {
      return requiredmessage(res, "Work Order not found.");
    }

    const stageCheck = await validateStageAssignments(stages, companyId);
    if (stageCheck.error) {
      return errorResponse(res, stageCheck.error);
    }

    const currentRows = await selectWithJoins(
      "workorderstage",
      [],
      { workOrderId: id, companyId, delete: 0 },
      ["workOrderStageId", "stage", "employeeId", "status"],
    );
    const currentByStage = new Map(currentRows.map((r) => [r.stage, r]));

    // Only Pending stages can be reassigned
    for (const r of stageCheck.rows) {
      const current = currentByStage.get(r.stage);
      if (
        current &&
        String(current.employeeId) !== String(r.employeeId) &&
        current.status !== "Pending"
      ) {
        return errorResponse(
          res,
          `${r.label} is already ${String(current.status).toLowerCase()} and cannot be reassigned.`,
        );
      }
    }

    for (const r of stageCheck.rows) {
      const current = currentByStage.get(r.stage);

      if (!current) {
        // work order created before stages existed
        await db.workorderstage.create({
          companyId,
          workOrderId: Number(id),
          stage: r.stage,
          stageOrder: r.stageOrder,
          employeeId: r.employeeId,
          status: "Pending",
          delete: 0,
        });
      } else if (String(current.employeeId) !== String(r.employeeId)) {
        await db.workorderstage.update(
          { employeeId: r.employeeId, updated: new Date() },
          { where: { workOrderStageId: current.workOrderStageId } },
        );
      }
    }

    return successResponse(
      res,
      { workOrderId: Number(id) },
      "Stage employees updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const startWorkOrderStage = async (req, res) => {
  try {
    const { companyId, employeeId } = req;

    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const workOrderStageId = normalizeId(req.body.workOrderStageId);
    if (!workOrderStageId) {
      return errorResponse(res, "Please select a Work Order.");
    }

    // the task must belong to this employee
    const rows = await selectWithJoins(
      "workorderstage",
      [],
      { workOrderStageId, companyId, employeeId, delete: 0 },
      ["workOrderStageId", "workOrderId", "stage", "stageOrder", "status"],
    );
    if (!rows.length) {
      return errorResponse(res, "Work order task not found.");
    }
    const task = rows[0];

    const workOrderRows = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: task.workOrderId, companyId, delete: 0 },
      ["workOrderId"],
    );
    if (!workOrderRows.length) {
      return errorResponse(res, "Work Order not found.");
    }

    if (task.status !== "Pending") {
      return errorResponse(res, "This work order has already been started.");
    }

    const stageDef = WORK_ORDER_STAGES.find((s) => s.key === task.stage);

    // material check only for Cutting (first stage)
    if (stageDef?.order === 1) {
      const materialStatusMap = await getMaterialStatusMap(
        [task.workOrderId],
        companyId,
      );
      if (
        materialStatusMap.get(String(task.workOrderId)) !==
        MATERIAL_STATUS.PURCHASE
      ) {
        return errorResponse(
          res,
          "Material for this work order is not complete yet.",
        );
      }
    }

    // stages run in order: earlier stages must be Completed
    const siblings = await selectWithJoins(
      "workorderstage",
      [],
      { workOrderId: task.workOrderId, delete: 0 },
      ["stageOrder", "status"],
    );
    const blocked = siblings.some(
      (s) => s.stageOrder < task.stageOrder && s.status !== "Completed",
    );
    if (blocked) {
      return errorResponse(res, "The previous stage is not completed yet.");
    }

    const needsItems = stageDef?.requiresItemVerification === true;

    const startTime = new Date();

    // only one request can flip Pending -> In Progress
    const [updated] = await db.workorderstage.update(
      {
        status: "In Progress",
        startTime,
        // stages that don't need item verification are auto-verified
        itemsVerified: needsItems ? false : true,
        itemsVerifiedAt: needsItems ? null : startTime,
        updated: startTime,
      },
      {
        where: {
          workOrderStageId,
          companyId,
          employeeId,
          status: "Pending",
          delete: 0,
        },
      },
    );
    if (!updated) {
      return errorResponse(res, "This work order has already been started.");
    }

    return successResponse(
      res,
      { workOrderStageId, startTime },
      "Work started successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// the logged-in employee's own stage row, or null
const loadMyStage = async (req, workOrderStageId) => {
  const rows = await selectWithJoins(
    "workorderstage",
    [],
    {
      workOrderStageId,
      companyId: req.companyId,
      employeeId: req.employeeId,
      delete: 0,
    },
    [
      "workOrderStageId",
      "workOrderId",
      "stage",
      "status",
      "itemsVerified",
      "startTime",
    ],
  );
  return rows[0] || null;
};

// Items to verify for one stage task
const getMyStageItems = async (req, res) => {
  try {
    const { companyId, employeeId } = req;
    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const workOrderStageId = normalizeId(req.query.workOrderStageId);
    if (!workOrderStageId) {
      return errorResponse(res, "Work order task is required.");
    }

    const task = await loadMyStage(req, workOrderStageId);
    if (!task) return errorResponse(res, "Work order task not found.");

    const result = await getStageItems({
      companyId,
      workOrderId: task.workOrderId,
      stageKey: task.stage,
    });
    if (result.error) return errorResponse(res, result.error);

    return successResponse(
      res,
      {
        workOrderStageId,
        workOrderNo: result.workOrder.workOrderNo,
        status: task.status,
        itemsVerified: Boolean(task.itemsVerified),
        items: result.items,
      },
      "Stage items fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// Save: every item of the stage must be verified
const saveStageItemVerification = async (req, res) => {
  try {
    const { companyId, employeeId } = req;
    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const workOrderStageId = normalizeId(req.body.workOrderStageId);
    if (!workOrderStageId) {
      return errorResponse(res, "Work order task is required.");
    }
    const submitted = new Set(
      (Array.isArray(req.body.bomItemIds) ? req.body.bomItemIds : []).map(
        String,
      ),
    );

    const task = await loadMyStage(req, workOrderStageId);
    if (!task) return errorResponse(res, "Work order task not found.");

    if (task.status !== "In Progress") {
      return errorResponse(res, "Work is not in progress.");
    }
    if (task.itemsVerified) {
      return errorResponse(res, "Items are already verified.");
    }

    // the server decides which items count, not the client
    const result = await getStageItems({
      companyId,
      workOrderId: task.workOrderId,
      stageKey: task.stage,
    });
    if (result.error) return errorResponse(res, result.error);

    if (result.items.some((i) => !submitted.has(String(i.bomItemId)))) {
      return errorResponse(res, "Please verify all items before saving.");
    }

    const now = new Date();
    const [updated] = await db.workorderstage.update(
      { itemsVerified: true, itemsVerifiedAt: now, updated: now },
      {
        where: {
          workOrderStageId,
          companyId,
          employeeId,
          status: "In Progress",
          itemsVerified: false,
          delete: 0,
        },
      },
    );
    if (!updated) {
      return errorResponse(
        res,
        "Unable to save. Please refresh and try again.",
      );
    }

    return successResponse(
      res,
      { workOrderStageId, itemsVerified: true },
      "Items verified successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// End Time: finish the stage
const endWorkOrderStage = async (req, res) => {
  try {
    const { companyId, employeeId } = req;
    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const workOrderStageId = normalizeId(req.body.workOrderStageId);
    if (!workOrderStageId) {
      return errorResponse(res, "Work order task is required.");
    }

    const task = await loadMyStage(req, workOrderStageId);
    if (!task) return errorResponse(res, "Work order task not found.");

    if (task.status === "Completed") {
      return errorResponse(res, "This work is already completed.");
    }
    if (task.status !== "In Progress") {
      return errorResponse(res, "Work has not been started.");
    }
    const stageDef = WORK_ORDER_STAGES.find((s) => s.key === task.stage);
    const needsItems = stageDef?.requiresItemVerification === true;

    if (needsItems && !task.itemsVerified) {
      return errorResponse(res, "Please verify and save the items first.");
    }

    const endTime = new Date();

    // only one request can flip In Progress -> Completed
    const where = {
      workOrderStageId,
      companyId,
      employeeId,
      status: "In Progress",
      delete: 0,
    };
    if (needsItems) {
      where.itemsVerified = true;
    }

    const [updated] = await db.workorderstage.update(
      { status: "Completed", endTime, updated: endTime },
      { where },
    );
    if (!updated) {
      return errorResponse(res, "This work is already completed.");
    }

    const durationSeconds = task.startTime
      ? Math.max(0, Math.floor((endTime - new Date(task.startTime)) / 1000))
      : 0;

    return successResponse(
      res,
      { workOrderStageId, endTime, durationSeconds },
      "Work completed successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getLookupMap = async (tableName, ids) => {
  const map = new Map();
  const cleanIds = [...new Set(ids.map(Number).filter((n) => n > 0))];
  if (!cleanIds.length) return map;

  const [cols] = await db.sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = :t`,
    { replacements: { t: tableName } },
  );
  const names = cols.map((c) => c.column_name);

  const idCol =
    names.find((n) => n.toLowerCase() === `${tableName}id`) ||
    names.find((n) => n.toLowerCase() === "id");
  const nameCol =
    names.find((n) => n.toLowerCase() === `${tableName}name`) ||
    names.find((n) => n.toLowerCase() === "categoryname") ||
    names.find((n) => n.toLowerCase() === "locationname") ||
    names.find((n) => /name$/i.test(n)) ||
    names.find((n) => /^name/i.test(n));

  if (!idCol || !nameCol) {
    console.error(`Lookup ${tableName}: id/name column not found`, names);
    return map;
  }

  const [rows] = await db.sequelize.query(
    `SELECT "${idCol}" AS id, "${nameCol}" AS name FROM "${tableName}" WHERE "${idCol}" IN (:ids)`,
    { replacements: { ids: cleanIds } },
  );
  rows.forEach((r) => map.set(Number(r.id), r.name));
  return map;
};

const getWorkOrderModelItems = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    // Step 1: work order
    const rows = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: id, companyId, delete: 0 },
      ["workOrderId", "salesOrderId", "model", "qty"],
    );

    if (!rows.length) {
      return requiredmessage(res, "Work Order not found.");
    }

    const workOrder = rows[0];

    // Step 2: model (live lead se, warna stored copy)
    const leadBySalesOrder = await getLeadMapBySalesOrder(
      [workOrder.salesOrderId],
      companyId,
    );
    const live = liveDetails(
      workOrder,
      leadBySalesOrder.get(String(workOrder.salesOrderId)),
    );

    const modelItemId = normalizeId(live.model);

    if (!modelItemId) {
      return successResponse(res, [], "No model selected on this Work Order");
    }

    // Step 3: us model ka BOM
    let bom = await db.bom.findOne({
      where: { companyId, finishedGoodsItemId: modelItemId, delete: 0 },
      order: [["bomId", "DESC"]],
      raw: true,
    });

    if (!bom) {
      const modelRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: modelItemId, companyId, delete: 0 },
        ["itemId", "itemName", "itemCode"],
      );

      const modelName = (modelRows[0]?.itemName || "").trim();
      const modelCode = (modelRows[0]?.itemCode || "").trim();

      if (modelName || modelCode) {
        const allItems = await selectWithJoins(
          "itemmaster",
          [],
          { companyId, delete: 0 },
          ["itemId", "itemName", "itemCode"],
        );
        const sameIds = allItems
          .filter(
            (i) =>
              (modelCode && String(i.itemCode).trim() === modelCode) ||
              (modelName &&
                String(i.itemName).trim().toLowerCase() ===
                  modelName.toLowerCase()),
          )
          .map((i) => Number(i.itemId));

        if (sameIds.length) {
          bom = await db.bom.findOne({
            where: { companyId, finishedGoodsItemId: sameIds, delete: 0 },
            order: [["bomId", "DESC"]],
            raw: true,
          });
        }

        if (!bom && modelName) {
          bom = await db.bom.findOne({
            where: { companyId, bomName: modelName, delete: 0 },
            order: [["bomId", "DESC"]],
            raw: true,
          });
        }
      }
    }

    if (!bom) {
      return successResponse(res, [], "No BOM found for this model");
    }

    // Step 4: BOM ke saare items
    const bomRows = await db.bomItem.findAll({
      where: { bomId: bom.bomId, delete: 0 },
      order: [["sortOrder", "ASC"]],
      raw: true,
    });

    if (!bomRows.length) {
      return successResponse(res, [], "BOM has no items");
    }

    // Step 5: item master details
    const masterRows = await selectWithJoins(
      "itemmaster",
      [],
      {
        itemId: [...new Set(bomRows.map((r) => r.itemId))],
        companyId,
        delete: 0,
      },
      [
        "itemId",
        "itemCode",
        "itemName",
        "hsnCode",
        "itemLocation",
        "itemCategoryId",
      ],
    );
    const masterMap = new Map(masterRows.map((m) => [Number(m.itemId), m]));

    // Step 6: category aur location ke naam
    let categoryMap = new Map();
    let locationMap = new Map();
    try {
      categoryMap = await getLookupMap(
        "itemcategory",
        masterRows.map((m) => m.itemCategoryId),
      );
    } catch (e) {
      console.error("Item category lookup failed:", e.message);
    }
    try {
      locationMap = await getLookupMap(
        "location",
        masterRows.map((m) => m.itemLocation),
      );
    } catch (e) {
      console.error("Item location lookup failed:", e.message);
    }

    const woQty = Number(workOrder.qty) || 1;

    const data = bomRows.map((r) => {
      const m = masterMap.get(Number(r.itemId)) || {};
      return {
        id: r.bomItemId,
        itemCode: m.itemCode || "-",
        itemName: m.itemName || "(item not found)",
        hsnCode: m.hsnCode || "",
        itemLocation:
          locationMap.get(Number(m.itemLocation)) || m.itemLocation || "",
        itemCategory: categoryMap.get(Number(m.itemCategoryId)) || "",
        qty: round2((Number(r.quantity) || 0) * woQty),
      };
    });

    return successResponse(res, data, "Model items fetched successfully");
  } catch (error) {
    console.error("getWorkOrderModelItems error:", error);
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
  assignWorkOrder,
  getStageEmployees,
  getMyWorkOrderTasks,
  updateWorkOrderStages,
  startWorkOrderStage,
  getMyStageItems,
  saveStageItemVerification,
  endWorkOrderStage,
  getWorkOrderModelItems,
};
