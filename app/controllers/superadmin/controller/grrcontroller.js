// controllers/superadmin/controller/grrcontroller.js
const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  selectWithJoins,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

// ---------------- GET NEXT GRR NUMBER ----------------
const getNextGrrNumber = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(
        res,
        "Financial Year not found in session. Please select a company year.",
      );

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "grr",
      idColumn: "grrId",
      prefixFor: "GRR",
    });

    return successResponse(
      res,
      { grrNo: billNo, fyLabel, financialYearId },
      "GRR number generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- PO LIST FOR "Select PO No." COMBOBOX ----------------
const getPurchaseOrdersForGrr = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0, status: "Generated" };
    if (financialYearId) where.financialYearId = financialYearId;

    const pos = await selectWithJoins("purchaseorder", [], where, [
      "purchaseOrderId",
      "poNumber",
      "poDate",
      "requiredDate",
      "serialNo",
    ]);
    if (!pos.length)
      return successResponse(res, [], "Purchase orders fetched successfully");

    const poIds = pos.map((p) => p.purchaseOrderId);

    const details = await selectWithJoins(
      "purchaseorderdetails",
      [],
      { purchaseOrderId: poIds, companyId, delete: 0 },
      ["purchaseOrderId", "supplierId"],
    );
    const supplierIdByPo = {};
    details.forEach((d) => {
      if (!supplierIdByPo[d.purchaseOrderId]) supplierIdByPo[d.purchaseOrderId] = d.supplierId;
    });

    const supplierIds = [...new Set(Object.values(supplierIdByPo).filter(Boolean))];
    let accountMap = {};
    if (supplierIds.length) {
      const accounts = await selectWithJoins(
        "account",
        [],
        { id: supplierIds, companyId, delete: 0 },
        ["id", "accountName", "mobileNo"],
      );
      accounts.forEach((a) => {
        accountMap[a.id] = a;
      });
    }

    // hide POs that already have a GRR — remove if partial/multiple GRRs get allowed
    const existingGrr = await selectWithJoins(
      "grr",
      [],
      { purchaseOrderId: poIds, companyId, delete: 0 },
      ["purchaseOrderId"],
    );
    const grrPoIds = new Set(existingGrr.map((g) => g.purchaseOrderId));

    const data = pos
      .filter((p) => !grrPoIds.has(p.purchaseOrderId))
      .map((p) => {
        const supplier = accountMap[supplierIdByPo[p.purchaseOrderId]] || {};
        return {
          id: p.purchaseOrderId,
          poNumber: p.poNumber,
          supplierName: supplier.accountName || "",
          supplierNumber: supplier.mobileNo || "",
          orderDate: p.poDate,
          requestedDate: p.requiredDate,
          serialNo: p.serialNo,
          label: `${p.poNumber} | ${supplier.accountName || ""}`,
        };
      });

    return successResponse(res, data, "Purchase orders fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- ITEMS FOR SELECTED PO (auto-fill header + item table) ----------------
const getPoItemsForGrr = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { purchaseOrderId } = req.params;
    if (!purchaseOrderId) return errorResponse(res, "Purchase order id is required.");

    const poRows = await selectWithJoins(
      "purchaseorder",
      [],
      { purchaseOrderId, companyId, delete: 0 },
      ["purchaseOrderId", "poNumber", "poDate", "requiredDate", "serialNo", "status"],
    );
    if (!poRows.length) return errorResponse(res, "Purchase order not found.");
    const po = poRows[0];

    const detailRows = await selectWithJoins(
      "purchaseorderdetails",
      [],
      { purchaseOrderId, companyId, delete: 0 },
      ["purchaseOrderDetailsId", "itemId", "supplierId", "itemCode", "itemName", "hsnCode", "uom", "qty"],
    );
    if (!detailRows.length) return errorResponse(res, "No items found for this purchase order.");

    const supplierId = detailRows[0].supplierId;
    let supplier = {};
    if (supplierId) {
      const supRows = await selectWithJoins(
        "account",
        [],
        { id: supplierId, companyId, delete: 0 },
        ["id", "accountName", "mobileNo"],
      );
      if (supRows.length) supplier = supRows[0];
    }

    const items = detailRows.map((d) => ({
      purchaseOrderDetailsId: d.purchaseOrderDetailsId,
      itemId: d.itemId,
      itemCode: d.itemCode,
      itemName: d.itemName,
      hsnCode: d.hsnCode,
      uom: d.uom,
      orderQty: Number(d.qty) || 0,
    }));

    return successResponse(
      res,
      {
        purchaseOrderId: po.purchaseOrderId,
        poNumber: po.poNumber,
        orderDate: po.poDate,
        requestedDate: po.requiredDate,
        serialNo: po.serialNo,
        supplierId,
        supplierName: supplier.accountName || "",
        supplierNumber: supplier.mobileNo || "",
        items,
      },
      "Purchase order items fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE GRR (Verify GRR button) ----------------
const createGrr = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId, purchaseOrderId, grrDate, remarks, items } = req.body;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(res, "Financial Year not found in session.");
    if (!purchaseOrderId) return errorResponse(res, "Purchase order is required.");
    if (!Array.isArray(items) || items.length === 0)
      return errorResponse(res, "Please add at least one item.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    const poRows = await selectWithJoins(
      "purchaseorder",
      [],
      { purchaseOrderId, companyId, delete: 0 },
      ["purchaseOrderId", "serialNo"],
    );
    if (!poRows.length) return errorResponse(res, "Purchase order not found or invalid.");

    // one GRR per PO — remove this block if partial/multiple GRRs get allowed
    const existing = await selectWithJoins(
      "grr",
      [],
      { purchaseOrderId, companyId, delete: 0 },
      ["grrId"],
    );
    if (existing.length) return errorResponse(res, "GRR already generated for this purchase order.");

    for (const row of items) {
      if (!row.purchaseOrderDetailsId)
        return errorResponse(res, `Purchase order item reference missing for "${row.itemName || "an item"}".`);
      if (row.inQty === undefined || row.inQty === null || Number(row.inQty) < 0)
        return errorResponse(res, `Invalid In Qty for "${row.itemName || "an item"}".`);
    }

    const detailIds = items.map((i) => i.purchaseOrderDetailsId);
    const detailRows = await selectWithJoins(
      "purchaseorderdetails",
      [],
      { purchaseOrderDetailsId: detailIds, purchaseOrderId, companyId, delete: 0 },
      ["purchaseOrderDetailsId", "itemId", "supplierId", "itemCode", "itemName", "hsnCode", "qty"],
    );
    if (detailRows.length !== items.length)
      return errorResponse(res, "One or more items do not belong to the selected purchase order.");

    const detailMap = {};
    let supplierId = null;
    detailRows.forEach((d) => {
      detailMap[d.purchaseOrderDetailsId] = d;
      if (!supplierId) supplierId = d.supplierId;
    });

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "grr",
      idColumn: "grrId",
      prefixFor: "GRR",
    });

    const grr = await saveModel("grr", {
      companyId,
      financialYearId: fy.financialYearId,
      purchaseOrderId,
      grrNo: billNo,
      grrDate,
      serialNo: poRows[0].serialNo || null,
      supplierId,
      remarks: remarks || "",
      status: "Completed",
      delete: 0,
    });

    for (const row of items) {
      const detail = detailMap[row.purchaseOrderDetailsId];
      const orderQty = Number(detail.qty) || 0;
      const inQty = Number(row.inQty) || 0;
      await saveModel("grritem", {
        grrId: grr.grrId,
        companyId,
        purchaseOrderId,
        purchaseOrderDetailsId: row.purchaseOrderDetailsId,
        itemId: detail.itemId,
        itemCode: detail.itemCode,
        itemName: detail.itemName,
        hsnCode: detail.hsnCode,
        orderQty,
        inQty,
        difference: Number((orderQty - inQty).toFixed(2)),
        delete: 0,
      });
    }

    return successResponse(
      res,
      { grrId: grr.grrId, grrNo: billNo },
      "GRR verified and saved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getGrrList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const grrs = await selectWithJoins("grr", [], where, [
      "grrId",
      "grrNo",
      "grrDate",
      "purchaseOrderId",
      "supplierId",
      "status",
    ]);
    if (!grrs.length) return successResponse(res, [], "GRR list fetched successfully");

    const poIds = [...new Set(grrs.map((g) => g.purchaseOrderId))];
    const pos = await selectWithJoins(
      "purchaseorder",
      [],
      { purchaseOrderId: poIds, companyId, delete: 0 },
      ["purchaseOrderId", "poNumber"],
    );
    const poMap = {};
    pos.forEach((p) => {
      poMap[p.purchaseOrderId] = p.poNumber;
    });

    const supplierIds = [...new Set(grrs.map((g) => g.supplierId).filter(Boolean))];
    let accountMap = {};
    if (supplierIds.length) {
      const accounts = await selectWithJoins(
        "account",
        [],
        { id: supplierIds, companyId, delete: 0 },
        ["id", "accountName", "mobileNo"],
      );
      accounts.forEach((a) => {
        accountMap[a.id] = a;
      });
    }

    const data = grrs.map((g) => ({
      id: String(g.grrId),
      grrNo: g.grrNo,
      grrDate: g.grrDate,
      poNumber: poMap[g.purchaseOrderId] || "",
      supplierName: accountMap[g.supplierId]?.accountName || "",
      supplierNumber: accountMap[g.supplierId]?.mobileNo || "",
      status: g.status,
    }));

    return successResponse(res, data, "GRR list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (view/print) ----------------
const getGrrById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    const { id } = req.params;

    const rows = await selectWithJoins(
      "grr",
      [],
      { grrId: id, companyId, delete: 0 },
      ["grrId", "grrNo", "grrDate", "purchaseOrderId", "serialNo", "supplierId", "remarks", "status"],
    );
    if (!rows.length) return requiredmessage(res, "GRR not found");

    const items = await selectWithJoins(
      "grritem",
      [],
      { grrId: id, companyId, delete: 0 },
      ["grrItemId", "itemId", "itemCode", "itemName", "hsnCode", "orderQty", "inQty", "difference"],
    );

    return successResponse(res, { ...rows[0], items }, "GRR fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getNextGrrNumber,
  getPurchaseOrdersForGrr,
  getPoItemsForGrr,
  createGrr,
  getGrrList,
  getGrrById,
};