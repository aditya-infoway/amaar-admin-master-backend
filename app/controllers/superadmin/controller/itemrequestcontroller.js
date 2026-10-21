const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  selectWithJoins,
} = require("../../../helper/index.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");
const db = require("../../../modelses");
const Bom = db.bom;
const BomItem = db.bomItem;
const { getFinancialYearById } = require("../../../helper/financialYear.js");


const getBomItemsByModel = async (companyId, modelId, productionQty = 1) => {
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

  const prodQty = Number(productionQty) || 1;

  return leafRows
    .filter((bi) => itemById[String(bi.itemId)])
    .map((bi) => {
      const master = itemById[String(bi.itemId)];
      // Material Availability jaisa: BOM quantity x work order qty
      const perUnitQty = Number(bi.quantity) || 0;
      return {
        id: bi.bomItemId,
        itemId: Number(bi.itemId),
        itemCode: master.itemCode || "",
        itemName: master.itemName || "",
        unit: master.unit || "",
        bomQty: Math.round(perUnitQty * prodQty * 100) / 100,
      };
    });
};

const getNetIssuedByItem = async (companyId, workOrderId, scope = null) => {
  // scope = { employeeId, department } -> sirf isi panel ki requests count hongi
  const inScope = (r) => {
    if (!scope) return true;
    return (
      Number(r.requestedBy) === Number(scope.employeeId) &&
      (r.department || null) === (scope.department || null)
    );
  };

  const issueReqs = (
    await selectWithJoins(
      "itemrequest",
      [],
      { companyId, workOrderId, requestType: "Issue", delete: 0 },
      ["itemRequestId", "requestedBy", "department"],
    )
  ).filter(inScope);

  const returnReqs = (
    await selectWithJoins(
      "itemrequest",
      [],
      { companyId, workOrderId, requestType: "Return", delete: 0 },
      ["itemRequestId", "requestedBy", "department"],
    )
  ).filter(inScope)

  const net = {};

  if (issueReqs.length) {
    const issues = await selectWithJoins(
      "itemissue",
      [],
      {
        itemRequestId: issueReqs.map((r) => r.itemRequestId),
        companyId,
        delete: 0,
      },
      ["itemId", "qty"],
    );
    issues.forEach((i) => {
      net[i.itemId] = (net[i.itemId] || 0) + (Number(i.qty) || 0);
    });
  }

  if (returnReqs.length) {
    const returned = await selectWithJoins(
      "itemrequestdetail",
      [],
      { itemRequestId: returnReqs.map((r) => r.itemRequestId), delete: 0 },
      ["itemId", "qty"],
    );
    returned.forEach((i) => {
      net[i.itemId] = (net[i.itemId] || 0) - (Number(i.qty) || 0);
    });
  }

  return net;
};
// Work Order me item-wise: ab tak Order ki hui qty minus Return ki hui qty
// Order: Pending + Complete dono count (double order na ho)
// Return: sirf store manager ke accept (status "Complete") ke baad wapas add hoga
const getNetOrderedByItem = async (companyId, workOrderId) => {
  const reqs = await selectWithJoins(
    "itemrequest",
    [],
    { companyId, workOrderId, delete: 0 },
    ["itemRequestId", "requestType", "status"],
  );
  if (!reqs.length) return {};

  const infoById = {};
  reqs.forEach((r) => { infoById[r.itemRequestId] = r; });

  const details = await selectWithJoins(
    "itemrequestdetail",
    [],
    { itemRequestId: reqs.map((r) => r.itemRequestId), delete: 0 },
    ["itemRequestId", "itemId", "qty"],
  );

  const net = {};
  details.forEach((d) => {
    const req = infoById[d.itemRequestId];
    if (!req) return;
    const q = Number(d.qty) || 0;

    if (req.requestType === "Return") {
      if (req.status !== "Complete") return; // pending return ignore
      net[d.itemId] = (net[d.itemId] || 0) - q;
    } else {
      net[d.itemId] = (net[d.itemId] || 0) + q;
    }
  });
  return net;
};
// ============================================================
// RETURN: Sirf wahi Work Orders jinme store manager ne item ISSUE kiya hai
// (net issued > 0, yaani poora return nahi ho chuka)
// ============================================================
const getIssuedWorkOrders = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const companyId = req.companyId;
    const employeeId = req.employeeId;
    const department = req.department || null;

    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { financialYearId } = req.query;

    // 1. Is employee ki is panel ki Issue requests
    const issueReqsAll = await selectWithJoins(
      "itemrequest",
      [],
      { companyId, requestType: "Issue", requestedBy: employeeId, delete: 0 },
      ["itemRequestId", "workOrderId", "department"],
    );
    const issueReqs = issueReqsAll.filter(
      (r) => (r.department || null) === department,
    );

    if (!issueReqs.length) {
      return successResponse(res, [], "No issued work orders");
    }

    // 2. Inme se kin requests ke against store manager ne actually issue kiya
    const issuedRows = await selectWithJoins(
      "itemissue",
      [],
      {
        itemRequestId: issueReqs.map((r) => r.itemRequestId),
        companyId,
        delete: 0,
      },
      ["itemRequestId", "qty"],
    );

    const issuedRequestIds = new Set(
      issuedRows
        .filter((i) => Number(i.qty) > 0)
        .map((i) => Number(i.itemRequestId)),
    );

    const candidateWoIds = [
      ...new Set(
        issueReqs
          .filter((r) => issuedRequestIds.has(Number(r.itemRequestId)))
          .map((r) => Number(r.workOrderId))
          .filter(Boolean),
      ),
    ];

    if (!candidateWoIds.length) {
      return successResponse(res, [], "No issued work orders");
    }

    // 3. Net issued (issue - return) > 0 wale hi rakho, sirf isi panel ke scope me
    const validWoIds = [];
    for (const woId of candidateWoIds) {
      const net = await getNetIssuedByItem(companyId, woId, {
        employeeId,
        department,
      });
      const hasReturnable = Object.values(net).some((q) => Number(q) > 0);
      if (hasReturnable) validWoIds.push(woId);
    }

    if (!validWoIds.length) {
      return successResponse(res, [], "No issued work orders");
    }

    const where = { workOrderId: validWoIds, companyId, delete: 0 };
    if (financialYearId) where.financialYearId = Number(financialYearId);

    const workOrders = await selectWithJoins(
      "workorder",
      [],
      where,
      ["workOrderId", "workOrderNo", "model"],
      [["workOrderId", "DESC"]],
    );

    const data = workOrders.map((wo) => ({
      id: Number(wo.workOrderId),
      workOrderNo: wo.workOrderNo || "",
      model: wo.model ? Number(wo.model) : null,
    }));

    return successResponse(res, data, "Issued Work Orders fetched successfully");
  } catch (error) {
    console.error("getIssuedWorkOrders error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// RETURN: Work Order me jo items issue hue hain (net qty > 0)
// bomQty field me net issued qty bhejte hain taaki frontend ka
// max-qty validation as it is chale
// ============================================================
const getReturnableItemsByWorkOrder = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;
    const department = req.department || null;

    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { workOrderId } = req.query;
    if (!workOrderId) {
      return errorResponse(res, "Work Order ID is required");
    }

    // sirf isi employee + isi panel ka net issued
    const net = await getNetIssuedByItem(companyId, Number(workOrderId), {
      employeeId,
      department,
    });

    const itemIds = Object.keys(net)
      .filter((id) => Number(net[id]) > 0)
      .map(Number);

    if (!itemIds.length) {
      return successResponse(res, [], "No returnable items");
    }

    const masters = await selectWithJoins(
      "itemmaster",
      [],
      { itemId: itemIds, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "unit"],
    );

    const data = masters.map((m) => ({
      id: Number(m.itemId), // return me itemId hi unique hai
      itemId: Number(m.itemId),
      itemCode: m.itemCode || "",
      itemName: m.itemName || "",
      unit: m.unit || "",
      bomQty: Number(net[m.itemId]) || 0, // = net issued qty (max return)
    }));

    return successResponse(res, data, "Returnable items fetched successfully");
  } catch (error) {
    console.error("getReturnableItemsByWorkOrder error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};


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

const getItemsByWorkOrder = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { workOrderId } = req.query;

    if (!workOrderId) {
      return errorResponse(res, "Work Order ID is required");
    }

    const workOrders = await selectWithJoins(
      "workorder",
      [],
      { workOrderId, companyId, delete: 0 },
      ["workOrderId", "workOrderNo", "model", "qty"],
    );

    if (!workOrders.length) {
      return errorResponse(res, "Work Order not found");
    }

    const modelId = workOrders[0].model ? Number(workOrders[0].model) : null;
    const productionQty = Number(workOrders[0].qty) || 1;

    if (!modelId) {
      return successResponse(res, [], "No model linked to this Work Order");
    }

    const bomItems = await getBomItemsByModel(companyId, modelId, productionQty);
    const ordered = await getNetOrderedByItem(companyId, Number(workOrderId));

    const items = bomItems
      .map((it) => ({
        ...it,
        bomQty: Math.max(0, Math.round((it.bomQty - (ordered[it.itemId] || 0)) * 100) / 100),
      }))
      .filter((it) => it.bomQty > 0); // poora order ho chuka to dropdown me mat dikhao

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
const getNextIssueNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId, requestType = "Issue" } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) {
      return errorResponse(res, "Financial Year not found. Please select a company year.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "itemrequest",
      idColumn: "itemRequestId",
      prefixFor: requestType === "Return" ? "ITEM RETURN" : "ITEM ORDER",
      extraWhere: { requestType },
    });

    return successResponse(res, { issueNo: billNo }, "Number generated successfully");
  } catch (error) {
    console.error("getNextIssueNo error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getNextStoreIssueNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId, requestType = "Issue" } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) {
      return errorResponse(res, "Financial Year not found. Please select a company year.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    const isReturn = requestType === "Return";

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: isReturn ? "itemreturn" : "itemissue",
      idColumn: isReturn ? "itemReturnId" : "itemIssueId",
      prefixFor: isReturn ? "STORE RETURN" : "STORE ISSUE",
    });

    return successResponse(res, { issueNo: billNo }, "Number generated successfully");
  } catch (error) {
    console.error("getNextStoreIssueNo error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};
// ==
// ==========================================================
// 3. CREATE ITEM REQUEST (Request to Store Manager)
// ============================================================
const createItemRequest = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;
    const department = req.department || null; // department route se aata hai

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      workOrderId,
      items,
      financialYearId,
      remarks,
      requestType = "Issue",
      issueDate,
    } = req.body;

    // ---------- Validation ----------
    if (!["Issue", "Return"].includes(requestType)) {
      return errorResponse(res, "Invalid request type");
    }
    if (!workOrderId) {
      return errorResponse(res, "Please select a Work Order");
    }
    if (!issueDate) {
      return errorResponse(
        res,
        `Please select ${requestType === "Return" ? "Return" : "Order"} Date`,
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Please add at least one item");
    }

    // Department route pe assignedEmployeeId check skip (stage assignment alag hai)
    // Purana contractor route (department nahi) pe check waisa hi rahega
    const woWhere = { workOrderId, companyId, delete: 0 };
    if (!department) woWhere.assignedEmployeeId = employeeId;

    // ✅ CHANGE 1: "qty" add kiya (work order ki production qty chahiye)
    const workOrders = await selectWithJoins(
      "workorder",
      [],
      woWhere,
      ["workOrderId", "workOrderNo", "model", "qty"],
    );

    if (!workOrders.length) {
      return errorResponse(res, "Work Order not found or not assigned to you");
    }

    const modelId = workOrders[0].model ? Number(workOrders[0].model) : null;
    // ✅ CHANGE 2: productionQty
    const productionQty = Number(workOrders[0].qty) || 1;
    if (!modelId) {
      return errorResponse(res, "No model linked to this Work Order");
    }

    // ---------- Qty validation ----------
    if (requestType === "Issue") {
      // ✅ CHANGE 3: productionQty pass kiya
      const bomLeaves = await getBomItemsByModel(companyId, modelId, productionQty);
      const ordered = await getNetOrderedByItem(companyId, Number(workOrderId));
      bomLeaves.forEach((l) => {
        l.bomQty = Math.max(0, Math.round((l.bomQty - (ordered[l.itemId] || 0)) * 100) / 100);
      });
      for (const row of items) {
        if (!row.itemId || !row.qty || Number(row.qty) <= 0) continue;

        const requestedQty = Number(row.qty);
        const matchingLeaf = bomLeaves.find(
          (leaf) =>
            leaf.itemId === Number(row.itemId) && requestedQty <= leaf.bomQty,
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
            `Qty for "${row.itemName || row.itemCode || "item"}" cannot exceed ${maxForItem} (remaining quantity)`
          );
        }
      }
    } else {
      // Return: is work order me jitna issue hua (minus pehle ka return) usse zyada nahi
      const net = await getNetIssuedByItem(companyId, workOrderId, { employeeId, department });

      for (const row of items) {
        if (!row.itemId || !row.qty || Number(row.qty) <= 0) continue;

        const maxReturn = Number(net[row.itemId]) || 0;
        if (Number(row.qty) > maxReturn) {
          return errorResponse(
            res,
            `Return qty for "${row.itemName || row.itemCode || "item"}" cannot exceed ${maxReturn} (issued qty)`,
          );
        }
      }
    }

    // ---------- Request No: ISS-0001 / RET-0001 ----------
    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    const { billNo: requestNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "itemrequest",
      idColumn: "itemRequestId",
      prefixFor: requestType === "Return" ? "ITEM RETURN" : "ITEM ORDER",
      extraWhere: { requestType },
    });

    const empRows = await selectWithJoins(
      "employee",
      [],
      { employeeId, companyId, delete: 0 },
      ["employeeId", "processId", "subProcessId"],
    );
    const processId = empRows[0]?.processId || null;
    const subProcessId = empRows[0]?.subProcessId || null;

    // ---------- Create Header ----------
    const header = await saveModel("itemrequest", {
      companyId,
      financialYearId: financialYearId || null,
      workOrderId,
      requestedBy: employeeId,
      status: "Pending",
      remarks: remarks || null,
      requestType,
      requestNo,
      issueDate,
      department,
      processId,
      subProcessId,
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
      { itemRequestId, requestNo },
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
        "requestType",
        "requestNo",
        "issueDate",
        "department",
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
        requestNo: r.requestNo || `#${r.itemRequestId}`,
        requestType: r.requestType || "Issue",
        issueDate: r.issueDate,
        department: r.department || "Contractor",
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
// ============================================================
// LIST: Department employee ki apni item requests
// ============================================================
const getDepartmentItemRequests = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;
    const department = req.department || null;

    if (!companyId || !employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const where = { companyId, requestedBy: employeeId, delete: 0 };
    if (department) where.department = department;
    if (req.query.financialYearId) {
      where.financialYearId = Number(req.query.financialYearId);
    }

    const requests = await selectWithJoins(
      "itemrequest",
      [],
      where,
      [
        "itemRequestId",
        "workOrderId",
        "status",
        "requestType",
        "requestNo",
        "issueDate",
        "created",
      ],
      [["itemRequestId", "DESC"]],
    );

    if (!requests.length) {
      return successResponse(res, [], "Item Requests fetched");
    }

    const workOrderIds = [
      ...new Set(requests.map((r) => r.workOrderId).filter(Boolean)),
    ];
    const workOrders = await selectWithJoins(
      "workorder",
      [],
      { workOrderId: workOrderIds, companyId, delete: 0 },
      ["workOrderId", "workOrderNo"],
    );
    const woMap = {};
    workOrders.forEach((w) => {
      woMap[w.workOrderId] = w.workOrderNo;
    });

    const details = await selectWithJoins(
      "itemrequestdetail",
      [],
      { itemRequestId: requests.map((r) => r.itemRequestId), delete: 0 },
      ["itemRequestId", "itemId", "itemCode", "itemName", "qty", "unit"],
    );
    const detailMap = {};
    details.forEach((d) => {
      (detailMap[d.itemRequestId] = detailMap[d.itemRequestId] || []).push({
        itemId: d.itemId,
        itemCode: d.itemCode,
        itemName: d.itemName,
        qty: Number(d.qty) || 0,
        unit: d.unit,
      });
    });

    const data = requests.map((r) => {
      const rowItems = detailMap[r.itemRequestId] || [];
      return {
        id: r.itemRequestId,
        requestNo: r.requestNo || `#${r.itemRequestId}`,
        requestType: r.requestType,
        issueDate: r.issueDate,
        workOrderNo: woMap[r.workOrderId] || "",
        status: r.status,
        totalItems: rowItems.length,
        items: rowItems,
        createdAt: r.created,
      };
    });

    return successResponse(res, data, "Item Requests fetched");
  } catch (error) {
    console.error("getDepartmentItemRequests error:", error);
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
      ["itemRequestId", "workOrderId", "requestedBy", "status", "remarks", "created",
        "requestType", "requestNo", "issueDate", "department"],
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
        requestNo: header.requestNo || `#${header.itemRequestId}`,
        requestType: header.requestType || "Issue",
        issueDate: header.issueDate,
        panel: header.department,
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
      ["itemId", "itemCode", "itemName", "unit", "openingStock", "itemLocation", "hsnCode", "itemCategoryId",],
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
    const categoryIds = [
      ...new Set(
        itemMasters
          .map((m) => m.itemCategoryId)
          .filter((val) => val && /^\d+$/.test(String(val)))
          .map((val) => Number(val)),
      ),
    ];

    let categoryNameById = {};
    if (categoryIds.length) {
      const categoryRows = await selectWithJoins(
        "itemcategory",
        [],
        { itemCategoryId: categoryIds, companyId, delete: 0 },
        ["itemCategoryId", "categoryName"],
      );
      categoryRows.forEach((c) => {
        categoryNameById[String(c.itemCategoryId)] = c.categoryName;
      });
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
    const itemReturns = await selectWithJoins(
      "itemreturn",
      [],
      { itemId: itemIds, companyId, delete: 0 },
      ["itemId", "qty"],
    );
    const returnedMap = {};
    itemReturns.forEach((d) => {
      returnedMap[d.itemId] = (returnedMap[d.itemId] || 0) + (Number(d.qty) || 0);
    });
    const detailIds = details.map((d) => d.itemRequestDetailId);
    const lineTable = header.requestType === "Return" ? "itemreturn" : "itemissue";
    const lineIssues = await selectWithJoins(
      lineTable,
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
      const availableQty =
        openingStock + purchaseStock - issuedStock + (Number(returnedMap[d.itemId]) || 0);

      const rawLocation = master.itemLocation;
      const resolvedLocation =
        rawLocation && /^\d+$/.test(String(rawLocation))
          ? locationNameById[String(rawLocation)] || rawLocation
          : rawLocation || "";

      // 👇 NEW
      const rawCategory = master.itemCategoryId;
      const resolvedCategory =
        rawCategory && /^\d+$/.test(String(rawCategory))
          ? categoryNameById[String(rawCategory)] || ""
          : rawCategory || "";

      return {
        id: d.itemRequestDetailId,
        itemId: Number(d.itemId),
        itemCode: d.itemCode || master.itemCode || "",
        itemName: d.itemName || master.itemName || "",
        hsnCode: master.hsnCode || "",
        itemCategory: resolvedCategory,   // 👈 master. hata diya
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

    const { itemRequestDetailId, qty, issueNo, issueDate, financialYearId } = req.body;
    const issueQty = Number(qty);

    if (!itemRequestDetailId) {
      return errorResponse(res, "Item Request Detail ID is required");
    }
    if (!issueQty || issueQty <= 0) {
      return errorResponse(res, "Qty must be greater than 0");
    }

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

    const headers = await selectWithJoins(
      "itemrequest",
      [],
      { itemRequestId: line.itemRequestId, companyId, delete: 0 },
      ["itemRequestId", "requestedBy", "requestType"],
    );
    if (!headers.length) {
      return errorResponse(res, "Item Request not found");
    }
    const requestedBy = headers[0].requestedBy || null;
    const isReturn = headers[0].requestType === "Return";

    // Issue -> itemissue, Return -> itemreturn
    const doneTable = isReturn ? "itemreturn" : "itemissue";
    const verb = isReturn ? "returned" : "issued";

    const prior = await selectWithJoins(
      doneTable,
      [],
      { itemRequestDetailId, delete: 0 },
      ["qty"],
    );
    const alreadyDone = prior.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const remainingQty = orderQty - alreadyDone;

    if (remainingQty <= 0) {
      return errorResponse(
        res,
        `The full quantity (${orderQty}) for this item has already been ${verb}.`,
      );
    }
    if (issueQty > remainingQty) {
      return errorResponse(
        res,
        `Only ${remainingQty} ${remainingQty === 1 ? "unit" : "units"} left (Requested: ${orderQty}, Already ${verb}: ${alreadyDone}).`,
      );
    }

    // Stock check sirf Issue pe (Return me stock badhta hai)
    if (!isReturn) {
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
      const purchaseStock = purchaseDetails.reduce((s, r) => s + (Number(r.qty) || 0), 0);

      const allIssues = await selectWithJoins(
        "itemissue",
        [],
        { itemId: line.itemId, companyId, delete: 0 },
        ["qty"],
      );
      const issuedStock = allIssues.reduce((s, r) => s + (Number(r.qty) || 0), 0);

      const allReturns = await selectWithJoins(
        "itemreturn",
        [],
        { itemId: line.itemId, companyId, delete: 0 },
        ["qty"],
      );
      const returnedStock = allReturns.reduce((s, r) => s + (Number(r.qty) || 0), 0);

      const availableQty = openingStock + purchaseStock - issuedStock + returnedStock;

      if (issueQty > availableQty) {
        return errorResponse(
          res,
          `Not enough stock available. Only ${availableQty} in stock right now.`,
        );
      }
    }

    if (isReturn) {
      await saveModel("itemreturn", {
        companyId,
        financialYearId: financialYearId || null,
        itemRequestId: line.itemRequestId,
        itemRequestDetailId: line.itemRequestDetailId,
        itemId: line.itemId,
        qty: issueQty,
        returnNo: issueNo || null,
        returnDate: issueDate || new Date(),
        returnedBy: requestedBy,
        receivedBy: employeeId,
        delete: 0,
      });
    } else {
      await saveModel("itemissue", {
        companyId,
        financialYearId: financialYearId || null,
        itemRequestId: line.itemRequestId,
        itemRequestDetailId: line.itemRequestDetailId,
        itemId: line.itemId,
        qty: issueQty,
        issuedTo: requestedBy,
        issuedBy: employeeId,
        billNo: null,
        issueNo: issueNo || null,
        issueDate: issueDate || new Date(),
        delete: 0,
      });
    }

    // Saari lines poori hui? to Complete
    const allLines = await selectWithJoins(
      "itemrequestdetail",
      [],
      { itemRequestId: line.itemRequestId, delete: 0 },
      ["itemRequestDetailId", "qty"],
    );
    const allDone = await selectWithJoins(
      doneTable,
      [],
      { itemRequestId: line.itemRequestId, delete: 0 },
      ["itemRequestDetailId", "qty"],
    );
    const doneByLine = {};
    allDone.forEach((r) => {
      doneByLine[r.itemRequestDetailId] =
        (doneByLine[r.itemRequestDetailId] || 0) + (Number(r.qty) || 0);
    });

    const isComplete = allLines.every(
      (l) => (doneByLine[l.itemRequestDetailId] || 0) >= (Number(l.qty) || 0),
    );

    if (isComplete) {
      await db.itemrequest.update(
        { status: "Complete" },
        { where: { itemRequestId: line.itemRequestId } },
      );
    }

    return successResponse(
      res,
      { issued: issueQty },
      isReturn ? "Item return accepted successfully" : "Item issued successfully",
    );
  } catch (error) {
    console.error("issueItemRequestItem error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};
// ============================================================
// STORE MANAGER: Open (not complete) requests, work order wise grouping ke liye
// ============================================================
const getOpenItemRequests = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const all = await selectWithJoins(
      "itemrequest",
      [],
      { companyId, delete: 0 },
      [
        "itemRequestId", "workOrderId", "requestedBy", "status",
        "requestType", "requestNo", "issueDate", "department", "created",
      ],
      [["itemRequestId", "DESC"]],
    );

    const requests = all.filter((r) => r.status !== "Complete");
    if (!requests.length) return successResponse(res, [], "Open requests fetched");

    const workOrderIds = [...new Set(requests.map((r) => r.workOrderId).filter(Boolean))];
    const workOrders = await selectWithJoins(
      "workorder", [], { workOrderId: workOrderIds, companyId, delete: 0 },
      ["workOrderId", "workOrderNo"],
    );
    const woMap = {};
    workOrders.forEach((w) => { woMap[w.workOrderId] = w.workOrderNo; });

    const employeeIds = [...new Set(requests.map((r) => r.requestedBy).filter(Boolean))];
    const employees = await selectWithJoins(
      "employee", [], { employeeId: employeeIds, companyId, delete: 0 },
      ["employeeId", "employeeName"],
    );
    const empMap = {};
    employees.forEach((e) => { empMap[e.employeeId] = e.employeeName; });

    const data = requests.map((r) => ({
      itemRequestId: r.itemRequestId,
      requestNo: r.requestNo || `#${r.itemRequestId}`,
      requestType: r.requestType || "Issue",
      issueDate: r.issueDate,
      workOrderId: r.workOrderId,
      workOrderNo: woMap[r.workOrderId] || "",
      requesterName: empMap[r.requestedBy] || "",
      panel: r.department || "Contractor",
      status: r.status,
    }));

    return successResponse(res, data, "Open requests fetched");
  } catch (error) {
    console.error("getOpenItemRequests error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};
module.exports = {
  getAssignedWorkOrders,
  getItemsByWorkOrder,
  createItemRequest,
  getNextIssueNo,
  getMyItemRequests,
  getDepartmentItemRequests,
  getItemRequestDetail,
  issueItemRequestItem,
  getNextStoreIssueNo,
  getOpenItemRequests,
  getIssuedWorkOrders,
  getReturnableItemsByWorkOrder,
};
