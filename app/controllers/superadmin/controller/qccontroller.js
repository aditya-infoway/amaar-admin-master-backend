const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  selectWithJoins,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

const today = () => new Date().toISOString().slice(0, 10);

// company ho ya employee — id se naam resolve
const resolveCreatedBy = async (ids) => {
  const clean = [...new Set(ids.filter(Boolean))];
  const map = {};
  if (!clean.length) return map;

  const companies = await selectWithJoins(
    "company",
    [],
    { companyId: clean, delete: 0 },
    ["companyId", "companyName"],
  );
  (companies || []).forEach((c) => {
    map[String(c.companyId)] = c.companyName;
  });

  const employees = await selectWithJoins(
    "employee",
    [],
    { employeeId: clean, delete: 0 },
    ["employeeId", "employeeName"],
  );
  (employees || []).forEach((e) => {
    if (!map[String(e.employeeId)]) map[String(e.employeeId)] = e.employeeName;
  });
  return map;
};

// ---------------- NEXT QC NUMBER ----------------
const getNextQcNumber = async (req, res) => {
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
      tableName: "qc",
      idColumn: "qcId",
      prefixFor: "QC",
    });

    return successResponse(
      res,
      { qcNo: billNo, fyLabel, financialYearId },
      "QC number generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GRR LIST FOR "Select GRR" DROPDOWN ----------------
// Only GRRs that do not have a QC yet
const getGrrListForQc = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0, status: "Completed" };
    if (financialYearId) where.financialYearId = financialYearId;

    const grrs = await selectWithJoins("grr", [], where, [
      "grrId",
      "grrNo",
      "grrDate",
      "supplierId",
    ]);
    if (!grrs.length)
      return successResponse(res, [], "GRR list fetched successfully");

    const grrIds = grrs.map((g) => g.grrId);
    const existingQc = await selectWithJoins(
      "qc",
      [],
      { grrId: grrIds, companyId, delete: 0 },
      ["grrId"],
    );
    const qcGrrIds = new Set(existingQc.map((q) => q.grrId));

    const supplierIds = [
      ...new Set(grrs.map((g) => g.supplierId).filter(Boolean)),
    ];
    const accountMap = {};
    if (supplierIds.length) {
      const accounts = await selectWithJoins(
        "account",
        [],
        { id: supplierIds, companyId, delete: 0 },
        ["id", "accountName"],
      );
      accounts.forEach((a) => {
        accountMap[a.id] = a;
      });
    }

    const data = grrs
      .filter((g) => !qcGrrIds.has(g.grrId))
      .map((g) => {
        const supplierName = accountMap[g.supplierId]?.accountName || "";
        return {
          id: String(g.grrId),
          grrNo: g.grrNo,
          grrDate: g.grrDate,
          supplierName,
          label: `${g.grrNo} | ${supplierName}`,
        };
      });

    return successResponse(res, data, "GRR list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- ITEMS OF SELECTED GRR (for "Select Item" dropdown) ----------------
const getGrrItemsForQc = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { grrId } = req.params;
    if (!grrId) return errorResponse(res, "GRR id is required.");

    const grrRows = await selectWithJoins(
      "grr",
      [],
      { grrId, companyId, delete: 0 },
      ["grrId", "grrNo", "grrDate", "supplierId"],
    );
    if (!grrRows.length) return errorResponse(res, "GRR not found.");
    const grr = grrRows[0];

    const existingQc = await selectWithJoins(
      "qc",
      [],
      { grrId, companyId, delete: 0 },
      ["qcId"],
    );
    if (existingQc.length)
      return errorResponse(res, "QC already completed for this GRR.");

    const itemRows = await selectWithJoins(
      "grritem",
      [],
      { grrId, companyId, delete: 0 },
      ["grrItemId", "itemId", "itemCode", "itemName", "hsnCode", "inQty"],
    );
    if (!itemRows.length)
      return errorResponse(res, "No items found for this GRR.");

    let supplier = {};
    if (grr.supplierId) {
      const supRows = await selectWithJoins(
        "account",
        [],
        { id: grr.supplierId, companyId, delete: 0 },
        ["id", "accountName", "mobileNo"],
      );
      if (supRows.length) supplier = supRows[0];
    }

    const items = itemRows.map((i) => ({
      grrItemId: i.grrItemId,
      itemId: i.itemId,
      itemCode: i.itemCode,
      itemName: i.itemName,
      hsnCode: i.hsnCode,
      inQty: Number(i.inQty) || 0,
    }));

    return successResponse(
      res,
      {
        grrId: grr.grrId,
        grrNo: grr.grrNo,
        grrDate: grr.grrDate,
        supplierName: supplier.accountName || "",
        supplierNumber: supplier.mobileNo || "",
        items,
      },
      "GRR items fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE QC (Submit) ----------------
const createQc = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      financialYearId,
      grrId,
      qcDate,
      remarks,
      items,
      createdBy,
      createdType,
    } = req.body;

    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(res, "Financial Year not found in session.");
    if (!grrId) return errorResponse(res, "GRR is required.");
    if (!Array.isArray(items) || items.length === 0)
      return errorResponse(res, "Please add at least one item.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    const grrRows = await selectWithJoins(
      "grr",
      [],
      { grrId, companyId, delete: 0 },
      ["grrId", "purchaseOrderId", "serialNo", "supplierId"],
    );
    if (!grrRows.length) return errorResponse(res, "GRR not found or invalid.");
    const grr = grrRows[0];

    // one QC per GRR — remove this block if multiple QCs per GRR get allowed
    const existing = await selectWithJoins(
      "qc",
      [],
      { grrId, companyId, delete: 0 },
      ["qcId"],
    );
    if (existing.length)
      return errorResponse(res, "QC already completed for this GRR.");

    // duplicate item check
    const itemIds = items.map((i) => String(i.grrItemId));
    if (new Set(itemIds).size !== itemIds.length)
      return errorResponse(res, "Same item cannot be added twice.");

    const grrItemRows = await selectWithJoins(
      "grritem",
      [],
      { grrItemId: items.map((i) => i.grrItemId), grrId, companyId, delete: 0 },
      ["grrItemId", "itemId", "itemCode", "itemName", "hsnCode", "inQty"],
    );
    if (grrItemRows.length !== items.length)
      return errorResponse(
        res,
        "One or more items do not belong to the selected GRR.",
      );

    const grrItemMap = {};
    grrItemRows.forEach((g) => {
      grrItemMap[g.grrItemId] = g;
    });

    // validate verifyQty against GRR inQty
    for (const row of items) {
      const g = grrItemMap[row.grrItemId];
      const inQty = Number(g.inQty) || 0;
      const verifyQty = Number(row.verifyQty);
      if (Number.isNaN(verifyQty) || verifyQty < 0)
        return errorResponse(res, `Invalid Verify Qty for "${g.itemName}".`);
      if (verifyQty > inQty)
        return errorResponse(
          res,
          `Verify Qty cannot be more than GRR In Qty (${inQty}) for "${g.itemName}".`,
        );
    }

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "qc",
      idColumn: "qcId",
      prefixFor: "QC",
    });

    const qc = await saveModel("qc", {
      companyId,
      financialYearId: fy.financialYearId,
      grrId,
      purchaseOrderId: grr.purchaseOrderId,
      qcNo: billNo,
      qcDate: qcDate || today(),
      serialNo: grr.serialNo || null,
      supplierId: grr.supplierId || null,
      remarks: remarks || "",
      status: "Completed",
      createdBy,
      createdType,
      delete: 0,
    });

    for (const row of items) {
      const g = grrItemMap[row.grrItemId];
      const inQty = Number(g.inQty) || 0;
      const verifyQty = Number(row.verifyQty) || 0;
      await saveModel("qcitem", {
        qcId: qc.qcId,
        companyId,
        grrId,
        grrItemId: g.grrItemId,
        itemId: g.itemId,
        itemCode: g.itemCode,
        itemName: g.itemName,
        hsnCode: g.hsnCode,
        inQty,
        verifyQty,
        rQty: Number((inQty - verifyQty).toFixed(2)),
        delete: 0,
      });
    }

    return successResponse(
      res,
      { qcId: qc.qcId, qcNo: billNo },
      "QC saved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getQcList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const qcs = await selectWithJoins("qc", [], where, [
      "qcId",
      "qcNo",
      "qcDate",
      "grrId",
      "supplierId",
      "status",
      "createdBy",
      "createdType",
    ]);
    if (!qcs.length)
      return successResponse(res, [], "QC list fetched successfully");

    const grrIds = [...new Set(qcs.map((q) => q.grrId))];
    const grrs = await selectWithJoins(
      "grr",
      [],
      { grrId: grrIds, companyId },
      ["grrId", "grrNo"],
    );
    const grrMap = {};
    grrs.forEach((g) => {
      grrMap[g.grrId] = g.grrNo;
    });

    const supplierIds = [
      ...new Set(qcs.map((q) => q.supplierId).filter(Boolean)),
    ];
    const accountMap = {};
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

    const createdByMap = await resolveCreatedBy(qcs.map((q) => q.createdBy));

    const data = qcs.map((q) => ({
      id: String(q.qcId),
      qcNo: q.qcNo,
      qcDate: q.qcDate,
      grrNo: grrMap[q.grrId] || "",
      supplierName: accountMap[q.supplierId]?.accountName || "",
      supplierNumber: accountMap[q.supplierId]?.mobileNo || "",
      status: q.status,
      createdBy: createdByMap[String(q.createdBy)] || q.createdBy || "",
      createdType: q.createdType || "",
    }));

    return successResponse(res, data, "QC list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (view/print) ----------------
const getQcById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    const { id } = req.params;

    const rows = await selectWithJoins(
      "qc",
      [],
      { qcId: id, companyId, delete: 0 },
      [
        "qcId",
        "qcNo",
        "qcDate",
        "grrId",
        "purchaseOrderId",
        "serialNo",
        "supplierId",
        "remarks",
        "status",
        "createdBy",
        "createdType",
      ],
    );
    if (!rows.length) return requiredmessage(res, "QC not found");
    const qc = rows[0];

    const items = await selectWithJoins(
      "qcitem",
      [],
      { qcId: id, companyId, delete: 0 },
      [
        "qcItemId",
        "grrItemId",
        "itemId",
        "itemCode",
        "itemName",
        "hsnCode",
        "inQty",
        "verifyQty",
        "rQty",
      ],
    );

    // no `delete: 0` on purpose — saved QC should still show GRR/supplier if removed later
    const grrRows = await selectWithJoins(
      "grr",
      [],
      { grrId: qc.grrId, companyId },
      ["grrId", "grrNo", "grrDate"],
    );
    const grr = grrRows[0] || {};

    let supplier = {};
    if (qc.supplierId) {
      const supRows = await selectWithJoins(
        "account",
        [],
        { id: qc.supplierId, companyId },
        ["id", "accountName", "mobileNo"],
      );
      if (supRows.length) supplier = supRows[0];
    }

    const createdByMap = await resolveCreatedBy([qc.createdBy]);

    return successResponse(
      res,
      {
        ...qc,
        grrNo: grr.grrNo || "",
        grrDate: grr.grrDate || "",
        supplierName: supplier.accountName || "",
        supplierNumber: supplier.mobileNo || "",
        items,
        createdBy: createdByMap[String(qc.createdBy)] || qc.createdBy || "",
        createdType: qc.createdType || "",
      },
      "QC fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getNextQcNumber,
  getGrrListForQc,
  getGrrItemsForQc,
  createQc,
  getQcList,
  getQcById,
};
