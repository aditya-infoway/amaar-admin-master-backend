const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  selectWithJoins,
} = require("../../../helper/index.js");

const db = require("../../../modelses");
const Bom = db.bom;
const BomItem = db.bomItem;

// ============================================================
// HELPER: Get all items (flat) from a BOM by finishedGoodsItemId
// ============================================================
const getBomItemsByModel = async (companyId, modelId) => {
  if (!modelId) return [];

  // Find BOM whose finished goods = the Work Order's model
  const bom = await Bom.findOne({
    where: {
      companyId,
      finishedGoodsItemId: modelId,
      delete: 0,
    },
    raw: true,
  });

  if (!bom) return [];

  // All items belonging to this BOM
  const bomItems = await BomItem.findAll({
    where: {
      bomId: bom.bomId,
      delete: 0,
    },
    raw: true,
  });

  if (!bomItems.length) return [];

  // Unique itemIds
  const itemIds = [...new Set(bomItems.map((i) => i.itemId).filter(Boolean))];

  // Fetch live Item Master data
  const items = await selectWithJoins(
    "itemmaster",
    [],
    { itemId: itemIds, companyId, delete: 0 },
    ["itemId", "itemCode", "itemName", "unit"],
  );

  return items.map((item) => ({
    id: Number(item.itemId),
    itemCode: item.itemCode || "",
    itemName: item.itemName || "",
    unit: item.unit || "",
  }));
};

// ============================================================
// 1. GET ASSIGNED WORK ORDERS (for dropdown)
//    You can also reuse the existing /contractor/workorder/list
// ============================================================
const getAssignedWorkOrders = async (req, res) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(
        res,
        "Unauthorized. Please login again.",
      );
    }

    const { financialYearId } = req.query;

    const where = {
      companyId,
      delete: 0,
    };

    if (financialYearId) {
      where.financialYearId = Number(financialYearId);
    }

    console.log("====================================");
    console.log("ITEM REQUEST - WORK ORDER LIST");
    console.log("companyId:", companyId);
    console.log("financialYearId:", financialYearId);
    console.log("where:", where);
    console.log("====================================");

    const workOrders = await selectWithJoins(
      "workorder",
      [],
      where,
      [
        "workOrderId",
        "workOrderNo",
        "model",
        "assignedEmployeeId",
      ],
      [["workOrderId", "DESC"]],
    );

    console.log(
      "WORK ORDERS FROM DATABASE:",
      workOrders,
    );

    const data = workOrders.map((wo) => ({
      id: Number(wo.workOrderId),

      workOrderNo:
        wo.workOrderNo || "",

      model:
        wo.model
          ? Number(wo.model)
          : null,

      assignedEmployeeId:
        wo.assignedEmployeeId
          ? Number(wo.assignedEmployeeId)
          : null,
    }));

    console.log(
      "WORK ORDER DROPDOWN DATA:",
      data,
    );

    return successResponse(
      res,
      data,
      "Work Orders fetched successfully",
    );
  } catch (error) {
    console.error(
      "getAssignedWorkOrders error:",
      error,
    );

    return errorResponse(
      res,
      error.message ||
        "Something Went Wrong",
      error,
    );
  }
};

// ============================================================
// 2. GET BOM ITEMS BY WORK ORDER
//    Frontend calls this after selecting a Work Order
// ============================================================
const getItemsByWorkOrder = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { workOrderId } = req.query; // or req.params

    if (!workOrderId) {
      return errorResponse(res, "Work Order ID is required");
    }

    // 1. Get the Work Order → its model
    const workOrders = await selectWithJoins(
      "workorder",
      [],
      {
        workOrderId,
        companyId,
        delete: 0,
      },
      ["workOrderId", "workOrderNo", "model"],
    );

    if (!workOrders.length) {
      return errorResponse(res, "Work Order not found");
    }

    const modelId = workOrders[0].model ? Number(workOrders[0].model) : null;

    if (!modelId) {
      return successResponse(res, [], "No model linked to this Work Order");
    }

    // 2. Get all items from the BOM of that model
    const items = await getBomItemsByModel(companyId, modelId);

    return successResponse(
      res,
      items,
      "BOM items for Work Order fetched successfully",
    );
  } catch (error) {
    console.error("getItemsByWorkOrder error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// 3. CREATE ITEM REQUEST (Request to Store Manager)
// ============================================================
const createItemRequest = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { workOrderId, items, financialYearId, remarks } = req.body;

    // ---------- Validation ----------
    if (!workOrderId) {
      return errorResponse(res, "Please select a Work Order");
    }

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Please add at least one item");
    }

    // Check Work Order exists + is assigned to current user
    const workOrders = await selectWithJoins(
      "workorder",
      [],
      {
        workOrderId,
        companyId,
        assignedEmployeeId: employeeId,
        delete: 0,
      },
      ["workOrderId", "workOrderNo", "model"],
    );

    if (!workOrders.length) {
      return errorResponse(
        res,
        "Work Order not found or not assigned to you",
      );
    }

    // ---------- Create Header ----------
    const header = await saveModel("itemrequest", {
      companyId,
      financialYearId: financialYearId || null,
      workOrderId,
      requestedBy: employeeId,
      status: "Pending", // Pending / Approved / Rejected / Issued
      remarks: remarks || null,
      delete: 0,
    });

    const itemRequestId = header.itemRequestId || header.id;

    // ---------- Create Line Items ----------
    for (const row of items) {
      if (!row.itemId || !row.qty || Number(row.qty) <= 0) continue;

      await saveModel("itemrequestdetail", {
        itemRequestId,
        itemId: Number(row.itemId),
        itemCode: row.itemCode || null,
        itemName: row.itemName || null,
        qty: Number(row.qty),
        unit: row.unit || null,
        delete: 0,
      });
    }

    return successResponse(
      res,
      { itemRequestId },
      "Item Request sent to Store Manager successfully",
    );
  } catch (error) {
    console.error("createItemRequest error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// 4. (Optional) LIST MY ITEM REQUESTS
// ============================================================
const getMyItemRequests = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const requests = await selectWithJoins(
      "itemrequest",
      [],
      {
        companyId,
        requestedBy: employeeId,
        delete: 0,
      },
      [
        "itemRequestId",
        "workOrderId",
        "status",
        "remarks",
        "created",
        "updated",
      ],
      [["itemRequestId", "DESC"]],
    );

    // You can join workOrderNo + details later if needed
    return successResponse(res, requests, "Item Requests fetched");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getAssignedWorkOrders,
  getItemsByWorkOrder,
  createItemRequest,
  getMyItemRequests,
};