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
const Bom = db.bom;
const BomItem = db.bomItem;
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
      employeeMobile: emp.mobileNumber || "",
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
    let quotationIdBySO = {};

    if (salesOrderIds.length > 0) {
      try {
        const salesOrders = await selectWithJoins(
          "salesorder",
          [],
          { salesOrderId: salesOrderIds, companyId, delete: 0 },
          ["salesOrderId", "soNo", "quotationId"],
        );

        salesOrderMap = salesOrders.reduce((map, so) => {
          map[String(so.salesOrderId)] = so.soNo || "";
          return map;
        }, {});

        // NEW: salesOrderId -> quotationId
        quotationIdBySO = salesOrders.reduce((map, so) => {
          map[String(so.salesOrderId)] = so.quotationId;
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

    // ========================================================
    // GET VEHICLE TYPE (Tipper / Trailer) FROM QUOTATION
    // ========================================================
    const quotationIds = [
      ...new Set(Object.values(quotationIdBySO).filter(Boolean)),
    ];

    let vehicleTypeMap = {};
    if (quotationIds.length > 0) {
      try {
        const quotations = await selectWithJoins(
          "quotation",
          [],
          { quotationId: quotationIds, companyId, delete: 0 },
          ["quotationId", "vehicleType"],
        );
        vehicleTypeMap = quotations.reduce((map, q) => {
          map[String(q.quotationId)] = q.vehicleType || "";
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching quotations:", err.message);
      }
    }




    // ========================================================
    // GET BODY REGISTER (Pending vs Generate)
    // ========================================================
    const workOrderIds = workOrders.map((w) => w.workOrderId);
    let bodyRegisterMap = {};

    if (workOrderIds.length > 0) {
      try {
        const bodyRegisters = await selectWithJoins(
          "bodyregister",
          [],
          { workOrderId: workOrderIds, companyId, delete: 0 },
          [
            "bodyRegisterId",
            "workOrderId",
            "vehicleType",
            "classOfVehicle",
            "makerName",
            "bodyNumber",
            "serialNo",
            "bodyYear",
            "engineNo",
            "noOfCylinder",
            "fuelUsed",
            "mfgMonthYear",
            "bodyColour",
            "grossVehicleWeight",
            "typeOfBody",
          ],
        );

        bodyRegisterMap = bodyRegisters.reduce((map, br) => {
          map[String(br.workOrderId)] = br;
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching body registers:", err.message);
      }
    }





    const stageMap = await getStageMap(workOrders.map((w) => w.workOrderId));

    const data = workOrders.map((workOrder) => {
      const live = liveDetails(
        workOrder,
        leadBySalesOrder.get(String(workOrder.salesOrderId)),
      );

      const br = bodyRegisterMap[String(workOrder.workOrderId)] || null;

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

        vehicleType:
          vehicleTypeMap[
          String(quotationIdBySO[String(workOrder.salesOrderId)])
          ] || "",

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

        bodyRegisterGenerated: !!br,
        bodyRegisterId: br ? br.bodyRegisterId : null,
        bodyRegister: br
          ? {
            bodyRegisterId: br.bodyRegisterId,
            vehicleType: br.vehicleType,
            classOfVehicle: br.classOfVehicle,
            makerName: br.makerName,
            bodyNumber: br.bodyNumber,
            serialNo: br.serialNo,
            bodyYear: br.bodyYear,
            engineNo: br.engineNo,
            noOfCylinder: br.noOfCylinder,
            fuelUsed: br.fuelUsed,
            mfgMonthYear: br.mfgMonthYear,
            bodyColour: br.bodyColour,
            grossVehicleWeight: br.grossVehicleWeight,
            typeOfBody: br.typeOfBody,
          }
          : null,
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
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const workOrderId = normalizeId(req.body.workOrderId);
    const processId = normalizeId(req.body.processId);
    const subProcessId = normalizeId(req.body.subProcessId); // optional
    const contractorId = normalizeId(
      req.body.contractorId || req.body.contractorManagerId,
    );
    const contractAmount = round2(req.body.contractAmount);

    if (!workOrderId) return errorResponse(res, "Work Order ID is required");
    if (!processId) return errorResponse(res, "Main Process is required");
    if (!contractorId) return errorResponse(res, "Contractor is required");
    if (contractAmount <= 0) {
      return errorResponse(res, "Contract amount must be greater than 0");
    }

    // 1) Work Order check
    const workOrderData = await selectWithJoins(
      "workorder",
      [],
      { workOrderId, companyId, delete: 0 },
      ["workOrderId"],
    );
    if (!workOrderData.length) {
      return errorResponse(res, "Work Order not found");
    }

    // 2) Is process ke sub process bane hain?
    const subRows = await selectWithJoins(
      "sub_process",
      [],
      { processId, delete: 0 },
      ["subProcessId"],
    );
    const hasSub = subRows.length > 0;

    if (hasSub && !subProcessId) {
      return errorResponse(res, "Sub Process is required for this process");
    }
    if (
      subProcessId &&
      !subRows.some((s) => Number(s.subProcessId) === subProcessId)
    ) {
      return errorResponse(res, "Sub Process does not belong to this process");
    }

    // 3) Contractor valid hai? (Production dept + usi process / sub process ka)
    const empRows = await selectWithJoins(
      "employee",
      [],
      { employeeId: contractorId, companyId, delete: 0 },
      ["employeeId", "department", "processId", "subProcessId"],
    );
    const emp = empRows[0];

    if (
      !emp ||
      String(emp.department || "").toLowerCase() !== "production" ||
      Number(emp.processId) !== processId ||
      (hasSub && Number(emp.subProcessId) !== subProcessId)
    ) {
      return errorResponse(
        res,
        "Selected contractor is not valid for this process",
      );
    }

    // 4) Pehle se assign hai to update (reassign), warna create
    const existing = await db.workorderassignment.findOne({
      where: {
        companyId,
        workOrderId,
        processId,
        subProcessId: subProcessId || null,
        delete: 0,
      },
    });

    if (existing) {
      if (existing.status !== "Pending") {
        return errorResponse(
          res,
          `This process is already ${String(existing.status).toLowerCase()} and cannot be reassigned.`,
        );
      }
      await existing.update({
        contractorId,
        contractAmount,
        updated: new Date(),
      });
    } else {
      await db.workorderassignment.create({
        companyId,
        workOrderId,
        processId,
        subProcessId: subProcessId || null,
        contractorId,
        contractAmount,
        status: "Pending",
        delete: 0,
      });
    }

    // 5) Purana field bhi sync rakho, taaki purani screens na tootein
    await db.workorder.update(
      { assignedEmployeeId: contractorId },
      { where: { workOrderId, companyId, delete: 0 } },
    );

    return successResponse(
      res,
      { workOrderId, processId, subProcessId, contractorId, contractAmount },
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

    // Sirf wahi process jo is employee (contractor) ko assign hui
    const mine = await db.workorderassignment.findAll({
      where: {
        companyId,
        contractorId: employeeId,
        delete: 0,
        ...(status ? { status } : {}),
      },
      order: [["workOrderAssignmentId", "DESC"]],
      raw: true,
    });
    if (!mine.length) return successResponse(res, [], "No tasks assigned");

    const workOrderIds = [...new Set(mine.map((m) => m.workOrderId))];
    const processIds = [...new Set(mine.map((m) => m.processId))];
    const subIds = [
      ...new Set(mine.map((m) => m.subProcessId).filter(Boolean)),
    ];

    const [workOrders, processRows, subRows] = await Promise.all([
      selectWithJoins(
        "workorder",
        [],
        { workOrderId: workOrderIds, companyId, delete: 0 },
        ["workOrderId", "workOrderNo", "customerName", "model", "qty", "created"],
      ),
      selectWithJoins(
        "main_process_detail",
        [],
        { processId: processIds, companyId, delete: 0 },
        ["processId", "processName"],
      ),
      subIds.length
        ? selectWithJoins(
            "sub_process",
            [],
            { subProcessId: subIds, delete: 0 },
            ["subProcessId", "subProcessName"],
          )
        : [],
    ]);

    const woById = new Map(workOrders.map((w) => [String(w.workOrderId), w]));
    const processName = new Map(
      processRows.map((p) => [Number(p.processId), p.processName]),
    );
    const subName = new Map(
      subRows.map((s) => [Number(s.subProcessId), s.subProcessName]),
    );

    const materialStatusMap = await getMaterialStatusMap(workOrderIds, companyId);

    const modelIds = [
      ...new Set(
        workOrders
          .map((w) => Number(w.model))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    let modelNameById = new Map();
    if (modelIds.length) {
      const models = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: modelIds, delete: 0 },
        ["itemId", "itemName"],
      );
      modelNameById = new Map(
        models.map((m) => [String(m.itemId), m.itemName || ""]),
      );
    }

    const data = mine
      .filter((m) => woById.has(String(m.workOrderId)))
      .map((m) => {
        const wo = woById.get(String(m.workOrderId));
        const pName = processName.get(Number(m.processId)) || "";
        const sName = subName.get(Number(m.subProcessId)) || "";

        return {
          workOrderStageId: m.workOrderAssignmentId, // frontend ke liye same key
          workOrderId: m.workOrderId,
          workOrderNo: wo.workOrderNo,
          workOrderDate: wo.created,
          materialStatus:
            materialStatusMap.get(String(m.workOrderId)) ||
            MATERIAL_STATUS.PENDING_MATERIAL,
          stageProgressStatus: null,
          customerName: wo.customerName,
          model: wo.model,
          modelName: modelNameById.get(String(wo.model)) || "",
          qty: wo.qty,
          processId: m.processId,
          subProcessId: m.subProcessId,
          stage: pName,
          stageLabel: sName ? `${pName} - ${sName}` : pName,
          stageOrder: 0,
          contractAmount: Number(m.contractAmount) || 0,
          status: m.status,
          isUnlocked: true,
          startTime: m.startTime,
          endTime: m.endTime,
          itemsVerified: true,
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

    const id = normalizeId(req.body.workOrderStageId);
    if (!id) return errorResponse(res, "Please select a Work Order.");

    // Task isi employee ka hona chahiye
    const task = await db.workorderassignment.findOne({
      where: { workOrderAssignmentId: id, companyId, contractorId: employeeId, delete: 0 },
      raw: true,
    });
    if (!task) return errorResponse(res, "Work order task not found.");
    if (task.status !== "Pending") {
      return errorResponse(res, "This work has already been started.");
    }

    const startTime = new Date();
    const [updated] = await db.workorderassignment.update(
      { status: "In Progress", startTime, updated: startTime },
      {
        where: {
          workOrderAssignmentId: id,
          companyId,
          contractorId: employeeId,
          status: "Pending",
          delete: 0,
        },
      },
    );
    if (!updated) {
      return errorResponse(res, "This work has already been started.");
    }

    return successResponse(res, { workOrderStageId: id, startTime }, "Work started successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const endWorkOrderStage = async (req, res) => {
  try {
    const { companyId, employeeId } = req;
    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const id = normalizeId(req.body.workOrderStageId);
    if (!id) return errorResponse(res, "Work order task is required.");

    const task = await db.workorderassignment.findOne({
      where: { workOrderAssignmentId: id, companyId, contractorId: employeeId, delete: 0 },
      raw: true,
    });
    if (!task) return errorResponse(res, "Work order task not found.");
    if (task.status === "Completed") {
      return errorResponse(res, "This work is already completed.");
    }
    if (task.status !== "In Progress") {
      return errorResponse(res, "Work has not been started.");
    }

    const endTime = new Date();
    const [updated] = await db.workorderassignment.update(
      { status: "Completed", endTime, updated: endTime },
      {
        where: {
          workOrderAssignmentId: id,
          companyId,
          contractorId: employeeId,
          status: "In Progress",
          delete: 0,
        },
      },
    );
    if (!updated) {
      return errorResponse(res, "This work is already completed.");
    }

    const durationSeconds = task.startTime
      ? Math.max(0, Math.floor((endTime - new Date(task.startTime)) / 1000))
      : 0;

    return successResponse(
      res,
      { workOrderStageId: id, endTime, durationSeconds },
      "Work completed successfully",
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


    // Only child (leaf) items: drop rows that have children under them
    const parentIds = new Set(
      bomRows
        .map((r) => r.parentId)            // <-- your parent column name
        .filter((p) => p !== null && p !== undefined && p !== 0)
        .map(Number),
    );
    const leafRows = bomRows.filter((r) => !parentIds.has(Number(r.bomItemId)));

    if (!leafRows.length) {
      return successResponse(res, [], "BOM has no child items");
    }

    // Step 5: item master details
    const masterRows = await selectWithJoins(
      "itemmaster",
      [],
      {
        itemId: [...new Set(leafRows.map((r) => r.itemId))],
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

    const data = leafRows.map((r) => {
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
const getAssignedProcesses = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const workOrderId = normalizeId(req.query.workOrderId);
    if (!workOrderId) {
      return errorResponse(res, "Work Order ID is required");
    }

    const rows = await db.workorderassignment.findAll({
      where: { companyId, workOrderId, delete: 0 },
      attributes: ["processId", "subProcessId"],
      raw: true,
    });

    return successResponse(res, rows, "Assigned processes fetched successfully");
  } catch (error) {
    console.error("getAssignedProcesses error:", error);
    return errorResponse(res, "Something Went Wrong", error);
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
  getAssignedProcesses
};
