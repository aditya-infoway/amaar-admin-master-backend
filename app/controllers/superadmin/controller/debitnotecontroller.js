const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  selectWithJoins,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");
const { updateAccountBalance } = require("../../../helper/accountBalance.js");

// ---------------- SHARED: build the valid chains ----------------
// Chain = Purchase Order -> GRR (Completed) -> QC (Completed) -> Purchase Register bill
// Returns every GRR that has all of them, plus which ones already have a debit note.
const buildChains = async (companyId, financialYearId) => {
  const base = { companyId, delete: 0 };
  if (financialYearId) base.financialYearId = financialYearId;

  const empty = {
    chains: [],
    qcByGrr: {},
    doneGrr: new Set(),
    doneQc: new Set(),
    grrHasDebit: new Set(),
    qcHasDebit: new Set(),
    billByPo: {},
  };

  const purchases = await selectWithJoins("purchase", [], base, [
    "purchaseId",
    "purchaseOrderId",
    "billNo",
  ]);
  const billedPoIds = [
    ...new Set(purchases.map((p) => p.purchaseOrderId).filter(Boolean)),
  ];

  const billByPo = {};
  purchases.forEach((p) => {
    if (p.purchaseOrderId && !billByPo[p.purchaseOrderId])
      billByPo[p.purchaseOrderId] = p.billNo;
  });
  if (!billedPoIds.length) return empty;

  const grrs = await selectWithJoins(
    "grr",
    [],
    { ...base, purchaseOrderId: billedPoIds, status: "Completed" },
    ["grrId", "grrNo", "grrDate", "purchaseOrderId", "supplierId"],
  );
  if (!grrs.length) return empty;

  const qcs = await selectWithJoins(
    "qc",
    [],
    { ...base, grrId: grrs.map((g) => g.grrId), status: "Completed" },
    ["qcId", "qcNo", "qcDate", "grrId"],
  );
  const qcByGrr = {};
  qcs.forEach((q) => {
    qcByGrr[q.grrId] = q;
  });

  const chains = grrs.filter((g) => g.supplierId && qcByGrr[g.grrId]);
  if (!chains.length) return empty;

  // which GRR / QC actually have something to debit
  const grrHasDebit = new Set();
  const qcHasDebit = new Set();

  const grrItems = await selectWithJoins(
    "grritem",
    [],
    { companyId, delete: 0, grrId: chains.map((c) => c.grrId) },
    ["grrId", "orderQty", "inQty"],
  );
  grrItems.forEach((r) => {
    if ((Number(r.orderQty) || 0) - (Number(r.inQty) || 0) > 0)
      grrHasDebit.add(r.grrId);
  });

  const qcItems = await selectWithJoins(
    "qcitem",
    [],
    {
      companyId,
      delete: 0,
      qcId: chains.map((c) => qcByGrr[c.grrId].qcId),
    },
    ["qcId", "rQty"],
  );
  qcItems.forEach((r) => {
    if ((Number(r.rQty) || 0) > 0) qcHasDebit.add(r.qcId);
  });

  // debit notes already raised (table may not exist yet -> everything pending)
  const doneGrr = new Set();
  const doneQc = new Set();
  try {
    const notes = await selectWithJoins(
      "debitnote",
      [],
      { companyId, delete: 0, grrId: chains.map((c) => c.grrId) },
      ["sourceType", "grrId", "qcId"],
    );
    notes.forEach((n) => {
      if (n.sourceType === "GRR") doneGrr.add(n.grrId);
      if (n.sourceType === "QC") doneQc.add(n.qcId);
    });
  } catch (e) {
    // debitnote table not created yet
  }

  return {
    chains,
    qcByGrr,
    doneGrr,
    doneQc,
    grrHasDebit,
    qcHasDebit,
    billByPo,
  };
};

// ---------------- PAGE 1: VENDOR SUMMARY ----------------
const getVendorSummary = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { chains, qcByGrr, doneGrr, doneQc, grrHasDebit, qcHasDebit } =
      await buildChains(companyId, req.query.financialYearId);
    if (!chains.length)
      return successResponse(res, [], "Vendor list fetched successfully");

    const stats = {};
    chains.forEach((g) => {
      const s = (stats[g.supplierId] ||= {
        pending: { grr: 0, qc: 0 },
        complete: { grr: 0, qc: 0 },
      });
      const qc = qcByGrr[g.grrId];
      if (doneGrr.has(g.grrId)) s.complete.grr += 1;
      else if (grrHasDebit.has(g.grrId)) s.pending.grr += 1;

      if (doneQc.has(qc.qcId)) s.complete.qc += 1;
      else if (qcHasDebit.has(qc.qcId)) s.pending.qc += 1;
    });

    const vendorIds = Object.keys(stats).filter((id) => {
      const s = stats[id];
      return s.pending.grr + s.pending.qc + s.complete.grr + s.complete.qc > 0;
    });
    if (!vendorIds.length)
      return successResponse(res, [], "Vendor list fetched successfully");

    const accounts = await selectWithJoins(
      "account",
      [],
      { id: vendorIds, companyId, delete: 0 },
      ["id", "accountName", "mobileNo"],
    );

    const data = accounts.map((a) => ({
      vendorId: String(a.id),
      vendorName: a.accountName || "",
      number: a.mobileNo || "",
      pending: stats[a.id].pending,
      complete: stats[a.id].complete,
    }));

    return successResponse(res, data, "Vendor list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- PAGE 2: GRR / QC LIST OF ONE VENDOR ----------------
// GET /debit-note/vendor/:vendorId/:type?status=pending|complete
const getVendorDocs = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { vendorId, type } = req.params;
    const status = req.query.status === "complete" ? "complete" : "pending";
    if (!["grr", "qc"].includes(type))
      return errorResponse(res, "Type must be grr or qc.");

    const {
      chains,
      qcByGrr,
      doneGrr,
      doneQc,
      grrHasDebit,
      qcHasDebit,
      billByPo,
    } = await buildChains(companyId, req.query.financialYearId);

    // this vendor's chains, then keep only pending or complete
    const mine = chains.filter(
      (g) => String(g.supplierId) === String(vendorId),
    );
    const picked = mine.filter((g) => {
      const qcId = qcByGrr[g.grrId].qcId;
      const done = type === "grr" ? doneGrr.has(g.grrId) : doneQc.has(qcId);
      const hasDebit =
        type === "grr" ? grrHasDebit.has(g.grrId) : qcHasDebit.has(qcId);
      return status === "complete" ? done : !done && hasDebit;
    });

    // vendor header
    const accRows = await selectWithJoins(
      "account",
      [],
      { id: vendorId, companyId, delete: 0 },
      ["id", "accountName", "mobileNo"],
    );
    const vendor = accRows[0] || {};

    // PO numbers
    const poMap = {};
    if (picked.length) {
      const pos = await selectWithJoins(
        "purchaseorder",
        [],
        { purchaseOrderId: picked.map((g) => g.purchaseOrderId), companyId },
        ["purchaseOrderId", "poNumber"],
      );
      pos.forEach((p) => {
        poMap[p.purchaseOrderId] = p.poNumber;
      });
    }

    const rows = picked.map((g) => {
      const qc = qcByGrr[g.grrId];
      return type === "grr"
        ? {
            id: String(g.grrId),
            docNo: g.grrNo,
            docDate: g.grrDate,
            poNo: poMap[g.purchaseOrderId] || "",
            billNo: billByPo[g.purchaseOrderId] || "",
          }
        : {
            id: String(qc.qcId),
            docNo: qc.qcNo,
            docDate: qc.qcDate,
            poNo: poMap[g.purchaseOrderId] || "",
            billNo: billByPo[g.purchaseOrderId] || "",
          };
    });

    return successResponse(
      res,
      {
        vendorName: vendor.accountName || "",
        number: vendor.mobileNo || "",
        rows,
      },
      "List fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const today = () => new Date().toISOString().slice(0, 10);
const round2 = (n) => Number(Number(n).toFixed(2));

// ---------------- SHARED: load the GRR / QC a debit note is raised on ----------------
// Debit qty:  GRR -> shortage (orderQty - inQty)   |   QC -> rejected qty (rQty)
// Rate + GST: taken from the purchase register bill of the same PO (same item)
const loadSource = async (companyId, type, id) => {
  let grr = null;
  let qc = null;

  if (type === "grr") {
    const rows = await selectWithJoins(
      "grr",
      [],
      { grrId: id, companyId, delete: 0 },
      ["grrId", "grrNo", "grrDate", "purchaseOrderId", "supplierId"],
    );
    grr = rows[0];
  } else {
    const qcRows = await selectWithJoins(
      "qc",
      [],
      { qcId: id, companyId, delete: 0 },
      ["qcId", "qcNo", "qcDate", "grrId", "purchaseOrderId", "supplierId"],
    );
    qc = qcRows[0];
    if (qc) {
      const rows = await selectWithJoins(
        "grr",
        [],
        { grrId: qc.grrId, companyId },
        ["grrId", "grrNo", "grrDate", "purchaseOrderId", "supplierId"],
      );
      grr = rows[0];
    }
  }
  if (!grr) return null;

  const purchaseOrderId = grr.purchaseOrderId;
  const supplierId = grr.supplierId;

  const pos = await selectWithJoins(
    "purchaseorder",
    [],
    { purchaseOrderId, companyId },
    ["purchaseOrderId", "poNumber"],
  );
  const accounts = await selectWithJoins(
    "account",
    [],
    { id: supplierId, companyId },
    ["id", "accountName"],
  );

  // rate + gst from the bill(s) of this PO
  const bills = await selectWithJoins(
    "purchase",
    [],
    { purchaseOrderId, companyId, delete: 0 },
    ["purchaseId", "billNo", "purchaseBillNo"],
  );
  const rateMap = {};
  if (bills.length) {
    const details = await selectWithJoins(
      "purchasedetails",
      [],
      { purchaseId: bills.map((b) => b.purchaseId), companyId, delete: 0 },
      ["itemId", "rate", "gstPct"],
    );
    details.forEach((d) => {
      if (!rateMap[d.itemId]) rateMap[d.itemId] = d;
    });
  }

  // debit quantity per item
  let rawItems;
  if (type === "grr") {
    const rows = await selectWithJoins(
      "grritem",
      [],
      { grrId: grr.grrId, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "hsnCode", "orderQty", "inQty"],
    );
    rawItems = rows.map((r) => ({
      ...r,
      qty: (Number(r.orderQty) || 0) - (Number(r.inQty) || 0),
    }));
  } else {
    const rows = await selectWithJoins(
      "qcitem",
      [],
      { qcId: qc.qcId, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "hsnCode", "rQty"],
    );
    rawItems = rows.map((r) => ({ ...r, qty: Number(r.rQty) || 0 }));
  }

  const items = rawItems
    .filter((r) => r.qty > 0)
    .map((r) => {
      const rate = Number(rateMap[r.itemId]?.rate) || 0;
      const gstPct = Number(rateMap[r.itemId]?.gstPct) || 0;
      const taxable = round2(rate * r.qty);
      const gstAmount = round2((taxable * gstPct) / 100);
      return {
        itemId: r.itemId,
        itemCode: r.itemCode,
        itemName: r.itemName,
        hsnCode: r.hsnCode,
        rate,
        qty: r.qty,
        gstPct,
        taxable,
        gstAmount,
        net: round2(taxable + gstAmount),
      };
    });

  return {
    type,
    sourceId: String(type === "grr" ? grr.grrId : qc.qcId),
    grrId: grr.grrId,
    qcId: qc ? qc.qcId : null,
    docNo: type === "grr" ? grr.grrNo : qc.qcNo,
    docDate: type === "grr" ? grr.grrDate : qc.qcDate,
    purchaseOrderId,
    poNo: pos[0]?.poNumber || "",
    billNo: bills[0]?.billNo || "",
    purchaseBillNo: bills[0]?.purchaseBillNo || "",
    purchaseId: bills[0]?.purchaseId || null,
    supplierId,
    vendorName: accounts[0]?.accountName || "",
    items,
    taxableValue: round2(items.reduce((s, i) => s + i.taxable, 0)),
    gstAmount: round2(items.reduce((s, i) => s + i.gstAmount, 0)),
    total: round2(items.reduce((s, i) => s + i.net, 0)),
  };
};

// has a debit note already been raised on this GRR / QC?
const debitNoteExists = async (companyId, type, src) => {
  try {
    const where = {
      companyId,
      delete: 0,
      sourceType: type.toUpperCase(),
      ...(type === "grr" ? { grrId: src.grrId } : { qcId: src.qcId }),
    };
    const rows = await selectWithJoins("debitnote", [], where, ["debitNoteId"]);
    return rows.length > 0;
  } catch (e) {
    return false; // table not created yet
  }
};

// ---------------- NEXT DEBIT NOTE NUMBER ----------------
const getNextDebitNoteNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(res, "Financial Year not found in session.");

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "debitnote",
      idColumn: "debitNoteId",
      prefixFor: "Debit Note",
    });
    return successResponse(
      res,
      { debitNoteNo: billNo, fyLabel, financialYearId },
      "Debit note number generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- PAGE 3: AUTO-FILL DATA ----------------
// GET /debit-note/source/:type/:id
const getDebitNoteSource = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { type, id } = req.params;
    if (!["grr", "qc"].includes(type))
      return errorResponse(res, "Type must be grr or qc.");

    const src = await loadSource(companyId, type, id);
    if (!src) return errorResponse(res, "Document not found.");
    if (await debitNoteExists(companyId, type, src))
      return errorResponse(
        res,
        "Debit note already created for this document.",
      );

    return successResponse(res, src, "Debit note source fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE DEBIT NOTE ----------------
//   Credit -> vendor DR (payable reduced)
const createDebitNote = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      financialYearId,
      type,
      sourceId,
      debitNoteDate,
      remarks,
      createdBy,
      createdType,
    } = req.body;

    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(res, "Financial Year not found in session.");
    if (!["grr", "qc"].includes(type))
      return errorResponse(res, "Type must be grr or qc.");
    if (!sourceId) return errorResponse(res, "Source document is required.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    const src = await loadSource(companyId, type, sourceId);
    if (!src) return errorResponse(res, "Document not found.");
    if (!src.items.length)
      return errorResponse(res, "Nothing to debit on this document.");
    if (await debitNoteExists(companyId, type, src))
      return errorResponse(
        res,
        "Debit note already created for this document.",
      );

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "debitnote",
      idColumn: "debitNoteId",
      prefixFor: "Debit Note",
    });

    const dnDate = debitNoteDate || today();
    const total = src.total;

    const dn = await saveModel("debitnote", {
      companyId,
      financialYearId: fy.financialYearId,
      debitNoteNo: billNo,
      debitNoteDate: dnDate,
      sourceType: type.toUpperCase(),
      grrId: src.grrId,
      qcId: src.qcId,
      purchaseOrderId: src.purchaseOrderId,
      supplierId: src.supplierId,
      paymentType: "Credit",
      refundAccountId: null,
      taxableValue: src.taxableValue,
      gstAmount: src.gstAmount,
      grandTotal: total,
      remarks: remarks || "",
      status: "Completed",
      createdBy,
      createdType,
      delete: 0,
    });

    for (const it of src.items) {
      await saveModel("debitnoteitem", {
        debitNoteId: dn.debitNoteId,
        companyId,
        itemId: it.itemId,
        itemCode: it.itemCode,
        itemName: it.itemName,
        hsnCode: it.hsnCode,
        rate: it.rate,
        qty: it.qty,
        gstPct: it.gstPct,
        taxable: it.taxable,
        gstAmt: it.gstAmount,
        total: it.net,
        delete: 0,
      });
    }

    // ---- accounting entries ----
    const autoNarration = `Debit Note ${billNo} (${type.toUpperCase()} ${src.docNo})`;
    const narration = remarks?.trim()
      ? `${autoNarration} - ${remarks.trim()}`
      : autoNarration;

    // vendor side: payable reduced (DR)
    await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "DEBIT NOTE",
      paymentCollectedByModules: "DN",
      voucherNo: billNo,
      date: dnDate,
      selfAccountId: src.supplierId,
      selfDrOrCr: "DR",
      accountId: src.supplierId,
      accountDrOrCr: "DR",
      amount: total,
      narration,
      paymentMode: "CREDIT",
      purchaseId: src.purchaseId,
      createdBy,
      createdType,
      status: "active",
      delete: 0,
    });

    await updateAccountBalance(src.supplierId, total, "DR", companyId);

    return successResponse(
      res,
      { debitNoteId: dn.debitNoteId, debitNoteNo: billNo },
      "Debit note saved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getVendorSummary,
  getVendorDocs,
  getNextDebitNoteNo,
  getDebitNoteSource,
  createDebitNote,
};
