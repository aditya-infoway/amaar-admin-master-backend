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
// (falls back to bomName == itemName match, since
//  finishedGoodsItemId is not yet saved on BOM create/update)
// ============================================================
const getBomItemsByModel = async (companyId, modelId) => {
  if (!modelId) return [];

  let bom = await Bom.findOne({
    where: { companyId, finishedGoodsItemId: modelId, delete: 0 },
    raw: true,
  });

  if (!bom) {
    const modelRows = await selectWithJoins(
      "itemmaster",
      [],
      { itemId: modelId, companyId, delete: 0 },
      ["itemId", "itemName"],
    );

    const modelName = modelRows[0]?.itemName;
    if (!modelName) return [];

    bom = await Bom.findOne({
      where: { companyId, bomName: modelName, delete: 0 },
      raw: true,
    });
  }

  if (!bom) return [];

  const bomItems = await BomItem.findAll({
    where: { bomId: bom.bomId, delete: 0 },
    raw: true,
  });

  if (!bomItems.length) return [];

  const parentIds = new Set(
    bomItems.map((bi) => bi.parentId).filter((id) => id !== null && id !== undefined),
  );

  const leafRows = bomItems.filter((bi) => !parentIds.has(bi.bomItemId));

  if (!leafRows.length) return [];

  const itemIds = [...new Set(leafRows.map((bi) => bi.itemId).filter(Boolean))];

  const items = await selectWithJoins(
    "itemmaster",
    [],
    { itemId: itemIds, companyId, delete: 0 },
    ["itemId", "itemCode", "itemName", "unit"],
  );

  const itemById = {};
  items.forEach((it) => { itemById[String(it.itemId)] = it; });

  return leafRows
    .filter((bi) => itemById[String(bi.itemId)])
    .map((bi) => {
      const master = itemById[String(bi.itemId)];
      return {
        id: bi.bomItemId,
        itemId: Number(bi.itemId),
        itemCode: master.itemCode || "",
        itemName: master.itemName || "",
        unit: master.unit || "",
        bomQty: Number(bi.asslyQty) || 0,
      };
    });
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
    const employeeId = req.employeeId;

    if (!companyId) {
      return requiredmessage(
        res,
        "Unauthorized. Please login again.",
      );
    }

    if (!employeeId) {
      return requiredmessage(
        res,
        "Unauthorized. Please login again.",
      );
    }

    const { financialYearId } = req.query;

    const where = {
      companyId,
      assignedEmployeeId: employeeId,
      delete: 0,
    };

    if (financialYearId) {
      where.financialYearId = Number(financialYearId);
    }

 

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

    // ---------- Validate qty against BOM ----------
    const modelId = workOrders[0].model ? Number(workOrders[0].model) : null;

    if (!modelId) {
      return errorResponse(res, "No model linked to this Work Order");
    }

    const bomLeaves = await getBomItemsByModel(companyId, modelId);

    for (const row of items) {
      if (!row.itemId || !row.qty || Number(row.qty) <= 0) continue;

      const requestedQty = Number(row.qty);

      // Allowed if any BOM leaf for this item can cover the requested qty
      const matchingLeaf = bomLeaves.find(
        (leaf) =>
          leaf.itemId === Number(row.itemId) &&
          requestedQty <= leaf.bomQty,
      );

      if (!matchingLeaf) {
        const maxForItem = Math.max(
          0,
          ...bomLeaves
            .filter((leaf) => leaf.itemId === Number(row.itemId))
            .map((leaf) => leaf.bomQty),
        );

        return errorResponse(
          res,
          `Qty for "${row.itemName || row.itemCode || "item"}" cannot exceed ${maxForItem} (BOM quantity)`,
        );
      }
    }

    // ---------- Create Header ----------
    const header = await saveModel("itemrequest", {
      companyId,
      financialYearId: financialYearId || null,
      workOrderId,
      requestedBy: employeeId,
      status: "Pending",
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
// ============================================================
// 4. (Optional) LIST MY ITEM REQUESTS
// ============================================================
const getMyItemRequests = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const filterWhere = {
      companyId,
      delete: 0,
    };

    const requests = await selectWithJoins(
      "itemrequest",
      [],
      filterWhere,
      [
        "itemRequestId",
        "workOrderId",
        "status",
        "remarks",
        "requestedBy",
        "created",
        "updated",
      ],
      [["itemRequestId", "DESC"]],
    );

    if (!requests.length) {
      return successResponse(res, [], "Item Requests fetched");
    }

    // ---- Work Orders (workOrderNo + model) ----
    const workOrderIds = [...new Set(requests.map((r) => r.workOrderId).filter(Boolean))];
    let workOrderMap = {};
    if (workOrderIds.length) {
      const workOrders = await selectWithJoins(
        "workorder",
        [],
        { workOrderId: workOrderIds, companyId, delete: 0 },
        ["workOrderId", "workOrderNo", "model"],
      );
      workOrders.forEach((wo) => { workOrderMap[wo.workOrderId] = wo; });
    }

    // ---- Model names (itemmaster se) ----
    const modelIds = [
      ...new Set(Object.values(workOrderMap).map((wo) => wo.model).filter(Boolean)),
    ];
    let modelNameMap = {};
    if (modelIds.length) {
      const models = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: modelIds, companyId, delete: 0 },
        ["itemId", "itemName"],
      );
      models.forEach((m) => { modelNameMap[m.itemId] = m.itemName; });
    }

    // ---- Contractor (requestedBy employee) ----
    const employeeIds = [...new Set(requests.map((r) => r.requestedBy).filter(Boolean))];
    let employeeMap = {};
    if (employeeIds.length) {
      const employees = await selectWithJoins(
        "employee",
        [],
        { employeeId: employeeIds, companyId, delete: 0 },
        ["employeeId", "employeeName"],
      );
      employees.forEach((e) => { employeeMap[e.employeeId] = e.employeeName; });
    }

    // ---- Final merged data ----
    const data = requests.map((r) => {
      const wo = workOrderMap[r.workOrderId] || {};
      return {
        itemRequestId: r.itemRequestId,
        workOrderId: wo.workOrderNo || r.workOrderId || "",
        model: modelNameMap[wo.model] || "",
        contractorName: employeeMap[r.requestedBy] || "",
        status: r.status,
        remarks: r.remarks,
        created: r.created,
        updated: r.updated,
      };
    });

    return successResponse(res, data, "Item Requests fetched");
  } catch (error) {
    console.error("getMyItemRequests error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getItemRequestDetail = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }
    if (!id) {
      return errorResponse(res, "Item Request ID is required");
    }

    // ---- Header ----
    const headers = await selectWithJoins(
      "itemrequest",
      [],
      { itemRequestId: id, companyId, delete: 0 },
      ["itemRequestId", "workOrderId", "requestedBy", "status", "remarks", "created"],
    );

    if (!headers.length) {
      return errorResponse(res, "Item Request not found");
    }
    const header = headers[0];

    // ---- Work Order + Model ----
    const workOrders = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: header.workOrderId, companyId, delete: 0 },
      ["workOrderId", "workOrderNo", "model"],
    );
    const workOrder = workOrders[0] || {};
    let modelName = "";
    if (workOrder.model) {
      const modelRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: workOrder.model, companyId, delete: 0 },
        ["itemId", "itemName"],
      );
      modelName = modelRows[0]?.itemName || "";
    }

    // ---- Contractor (requestedBy employee) ----
    const employees = await selectWithJoins(
      "employee",
      [],
      { employeeId: header.requestedBy, companyId, delete: 0 },
      ["employeeId", "employeeName", "mobileNumber"],
    );
    const contractor = employees[0] || {};

    // ---- Item Request Detail rows (Order Qty yahan se) ----
    const details = await selectWithJoins(
      "itemrequestdetail",
      [],
      { itemRequestId: header.itemRequestId, delete: 0 },
      ["itemRequestDetailId", "itemId", "itemCode", "itemName", "qty", "unit"],
    );

    if (!details.length) {
      return successResponse(res, {
        itemRequestId: header.itemRequestId,
        workOrderId: workOrder.workOrderId || null,
        workOrderNo: workOrder.workOrderNo || "",
        modelName,
        contractorName: contractor.employeeName || "",
        contractorNumber: contractor.mobileNumber || "",
        status: header.status,
        items: [],
      }, "Item Request detail fetched");
    }

    const itemIds = [...new Set(details.map((d) => Number(d.itemId)).filter(Boolean))];

    // ---- Item master: openingStock + itemLocation + itemCode/itemName fallback ----
    const itemMasters = await selectWithJoins(
      "itemmaster",
      [],
      { itemId: itemIds, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "unit", "openingStock", "itemLocation"],
    );
    const masterById = {};
    itemMasters.forEach((m) => { masterById[String(m.itemId)] = m; });

    const locationIds = [
      ...new Set(
        itemMasters
          .map((m) => m.itemLocation)
          .filter((val) => val && /^\d+$/.test(String(val))) // sirf pure-numeric values
          .map((val) => Number(val)),
      ),
    ];

    let locationNameById = {};
    if (locationIds.length) {
      const locationRows = await selectWithJoins(
        "location",
        [],
        { locationId: locationIds, companyId, delete: 0 },
        ["locationId", "locationName"],
      );
      locationRows.forEach((l) => { locationNameById[String(l.locationId)] = l.locationName; });
    }

    // ---- Purchase qty (Stock Report jaisi hi logic — available qty ke liye) ----
    const purchaseDetails = await selectWithJoins(
      "purchasedetails",
      [],
      { itemId: itemIds, companyId, delete: 0 },
      ["itemId", "qty"],
    );
    const stockMap = {};
    purchaseDetails.forEach((d) => {
      const qty = Number(d.qty) || 0;
      stockMap[d.itemId] = (stockMap[d.itemId] || 0) + qty;
    });

    // ---- ✅ NEW — Issued qty (Stock Report jaisi hi logic, availableQty se minus) ----
     // ---- ✅ NEW — Issued qty for AVAILABLE STOCK calculation (company-wide, itemId-based — sahi rehne do) ----
    const itemIssues = await selectWithJoins(
      "itemissue",
      [],
      { itemId: itemIds, companyId, delete: 0 },
      ["itemId", "qty"],
    );
    const issuedMap = {};
    itemIssues.forEach((d) => {
      const qty = Number(d.qty) || 0;
      issuedMap[d.itemId] = (issuedMap[d.itemId] || 0) + qty;
    });

    // ---- ✅ FIXED — Issued qty for THIS SPECIFIC request line (itemRequestDetailId-based) ----
    const detailIds = details.map((d) => d.itemRequestDetailId);
    const lineIssues = await selectWithJoins(
      "itemissue",
      [],
      { itemRequestDetailId: detailIds, delete: 0 },
      ["itemRequestDetailId", "qty"],
    );
    const issuedByDetailMap = {};
    lineIssues.forEach((d) => {
      const qty = Number(d.qty) || 0;
      issuedByDetailMap[d.itemRequestDetailId] =
        (issuedByDetailMap[d.itemRequestDetailId] || 0) + qty;
    });

    const items = details.map((d) => {
      const master = masterById[String(d.itemId)] || {};
      const openingStock = Number(master.openingStock) || 0;
      const purchaseStock = Number(stockMap[d.itemId]) || 0;
      const issuedStock = Number(issuedMap[d.itemId]) || 0;
      const availableQty = openingStock + purchaseStock - issuedStock; // ✅ issued minus

      // ✅ agar itemLocation numeric hai to location table se naam lo, warna text as-is
      const rawLocation = master.itemLocation;
      const resolvedLocation =
        rawLocation && /^\d+$/.test(String(rawLocation))
          ? locationNameById[String(rawLocation)] || rawLocation
          : rawLocation || "";

      return {
        id: d.itemRequestDetailId,
        itemId: Number(d.itemId),
        itemCode: d.itemCode || master.itemCode || "",
        itemName: d.itemName || master.itemName || "",
        itemLocation: resolvedLocation,
            issuedQty: Number(issuedByDetailMap[d.itemRequestDetailId]) || 0, 
        orderQty: Number(d.qty) || 0,
        availableQty,
        unit: d.unit || master.unit || "",
      };
    });

    const data = {
      itemRequestId: header.itemRequestId,
      workOrderId: workOrder.workOrderId || null,
      workOrderNo: workOrder.workOrderNo || "",
      modelName,
      contractorName: contractor.employeeName || "",
      contractorNumber: contractor.mobileNumber || "",
      status: header.status,
      items,
    };

    return successResponse(res, data, "Item Request detail fetched");
  } catch (error) {
    console.error("getItemRequestDetail error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};
// ============================================================
// 6. ISSUE ITEM (Store Manager issues qty against a request line)
// ============================================================
const issueItemRequestItem = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { itemRequestDetailId, qty } = req.body;
    const issueQty = Number(qty);

    if (!itemRequestDetailId) {
      return errorResponse(res, "Item Request Detail ID is required");
    }
    if (!issueQty || issueQty <= 0) {
      return errorResponse(res, "Issue Qty must be greater than 0");
    }

    // ---- Line item + parent header fetch karo ----
    const lines = await selectWithJoins(
      "itemrequestdetail",
      [],
      { itemRequestDetailId, delete: 0 },
      ["itemRequestDetailId", "itemRequestId", "itemId", "qty"],
    );
    if (!lines.length) {
      return errorResponse(res, "Item Request line not found");
    }
    const line = lines[0];
    const orderQty = Number(line.qty) || 0;

    // ---- Already issued qty (isi line ke against) ----
    const priorIssues = await selectWithJoins(
      "itemissue",
      [],
      { itemRequestDetailId, delete: 0 },
      ["qty"],
    );
    const alreadyIssued = priorIssues.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
    const remainingOrderQty = orderQty - alreadyIssued;

        if (remainingOrderQty <= 0) {
      return errorResponse(
        res,
        `The full ordered quantity (${orderQty}) for this item has already been issued.`,
      );
    }

    if (issueQty > remainingOrderQty) {
      return errorResponse(
        res,
        `Only ${remainingOrderQty} ${remainingOrderQty === 1 ? "unit" : "units"} left to issue (Ordered: ${orderQty}, Already Issued: ${alreadyIssued}).`,
      );
    }
    // ---- Available stock check (Stock Report jaisi hi logic) ----
    const itemMasters = await selectWithJoins(
      "itemmaster",
      [],
      { itemId: line.itemId, companyId, delete: 0 },
      ["itemId", "openingStock"],
    );
    const openingStock = Number(itemMasters[0]?.openingStock) || 0;

    const purchaseDetails = await selectWithJoins(
      "purchasedetails",
      [],
      { itemId: line.itemId, companyId, delete: 0 },
      ["qty"],
    );
    const purchaseStock = purchaseDetails.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);

    const priorAllIssues = await selectWithJoins(
      "itemissue",
      [],
      { itemId: line.itemId, companyId, delete: 0 },
      ["qty"],
    );
    const issuedStock = priorAllIssues.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);

    const availableQty = openingStock + purchaseStock - issuedStock;

      if (issueQty > availableQty) {
      return errorResponse(
        res,
        `Not enough stock available. Only ${availableQty} in stock right now.`,
      );
    }

    // ---- Header se requestedBy (contractor) nikalo ----
    const headers = await selectWithJoins(
      "itemrequest",
      [],
      { itemRequestId: line.itemRequestId, companyId, delete: 0 },
      ["itemRequestId", "requestedBy"],
    );
    const requestedBy = headers[0]?.requestedBy || null;

    // ---- Issue record insert ----
      // ---- Issue record insert ----
    await saveModel("itemissue", {
      companyId,
      itemRequestId: line.itemRequestId,
      itemRequestDetailId: line.itemRequestDetailId,
      itemId: line.itemId,
      qty: issueQty,
      issuedTo: requestedBy,
      issuedBy: employeeId,
      billNo: null,
      delete: 0,
    });

    // ---- ✅ NEW — check karo saari lines fully issue ho gayi ya nahi, status update karo ----
    const allLines = await selectWithJoins(
      "itemrequestdetail",
      [],
      { itemRequestId: line.itemRequestId, delete: 0 },
      ["itemRequestDetailId", "qty"],
    );

    const allIssuesForRequest = await selectWithJoins(
      "itemissue",
      [],
      { itemRequestId: line.itemRequestId, delete: 0 },
      ["itemRequestDetailId", "qty"],
    );

    const issuedByLine = {};
    allIssuesForRequest.forEach((r) => {
      const qty = Number(r.qty) || 0;
      issuedByLine[r.itemRequestDetailId] = (issuedByLine[r.itemRequestDetailId] || 0) + qty;
    });

    const isFullyIssued = allLines.every((l) => {
      const issued = Number(issuedByLine[l.itemRequestDetailId]) || 0;
      return issued >= (Number(l.qty) || 0);
    });

    if (isFullyIssued) {
      await db.itemrequest.update(
        { status: "Complete" },
        { where: { itemRequestId: line.itemRequestId } },
      );
    }

    return successResponse(res, { issued: issueQty }, "Item issued successfully");
  } catch (error) {
    console.error("issueItemRequestItem error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};
module.exports = {
  getAssignedWorkOrders,
  getItemsByWorkOrder,
  createItemRequest,
  getMyItemRequests,
  getItemRequestDetail, 
   issueItemRequestItem,
};
