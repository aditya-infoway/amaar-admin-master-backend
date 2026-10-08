const { selectWithJoins } = require("./index.js");

const MATERIAL_STATUS = {
    PENDING_MATERIAL: "Pending Material",
    INDENT: "Indent Generate",
    PO: "PO Generate",
    GRR: "GRR Complete",
    QC: "QC Complete",
    PURCHASE: "Purchase Complete",
};

// index = how far the chain has progressed
const STATUS_BY_LEVEL = [
    MATERIAL_STATUS.PENDING_MATERIAL,
    MATERIAL_STATUS.INDENT,
    MATERIAL_STATUS.PO,
    MATERIAL_STATUS.GRR,
    MATERIAL_STATUS.QC,
    MATERIAL_STATUS.PURCHASE,
];

// Map<workOrderId (string), status>
const getMaterialStatusMap = async (workOrderIds, companyId) => {
    const map = new Map();
    const ids = [...new Set((workOrderIds || []).filter(Boolean))];

    ids.forEach((id) => map.set(String(id), STATUS_BY_LEVEL[0]));
    if (!ids.length) return map;

    const indents = await selectWithJoins(
        "indent",
        [],
        { workOrderId: ids, companyId, delete: 0 },
        ["indentId", "workOrderId"],
    );
    if (!indents.length) return map;

    const workOrderByIndent = new Map(
        indents.map((i) => [String(i.indentId), String(i.workOrderId)]),
    );
    indents.forEach((i) => map.set(String(i.workOrderId), STATUS_BY_LEVEL[1]));

    const orders = await selectWithJoins(
        "purchaseorder",
        [],
        { indentId: indents.map((i) => i.indentId), companyId, delete: 0 },
        ["purchaseOrderId", "indentId", "status"],
    );
    // Draft POs are not generated yet; any other status counts
    const generatedOrders = orders.filter((o) => o.status !== "Draft");
    if (!generatedOrders.length) return map;

    const poIds = generatedOrders.map((o) => o.purchaseOrderId);

    const [grrs, purchases] = await Promise.all([
        selectWithJoins(
            "grr",
            [],
            { purchaseOrderId: poIds, companyId, delete: 0 },
            ["grrId", "purchaseOrderId"],
        ),
        selectWithJoins(
            "purchase",
            [],
            { purchaseOrderId: poIds, companyId, delete: 0 },
            ["purchaseId", "purchaseOrderId"],
        ),
    ]);

    const qcs = grrs.length
        ? await selectWithJoins(
            "qc",
            [],
            { grrId: grrs.map((g) => g.grrId), companyId, delete: 0 },
            ["qcId", "grrId"],
        )
        : [];

    const grrByPo = new Map(
        grrs.map((g) => [String(g.purchaseOrderId), String(g.grrId)]),
    );
    const qcDoneGrr = new Set(qcs.map((q) => String(q.grrId)));
    const purchasedPo = new Set(purchases.map((p) => String(p.purchaseOrderId)));

    // level of one PO: 2 = PO, 3 = GRR, 4 = QC, 5 = Purchase
    // level of one PO: 2 = PO, 3 = GRR, 4 = QC, 5 = Purchase
    const levelOf = (po) => {
        const poKey = String(po.purchaseOrderId);
        if (purchasedPo.has(poKey)) return 5;   // purchase ban gayi to complete
        if (!grrByPo.has(poKey)) return 2;
        if (!qcDoneGrr.has(grrByPo.get(poKey))) return 3;
        return 4;
    };

    // a work order is only as far along as its slowest PO
    const levelByWorkOrder = new Map();
    generatedOrders.forEach((po) => {
        const woId = workOrderByIndent.get(String(po.indentId));
        const level = levelOf(po);
        levelByWorkOrder.set(woId, Math.min(levelByWorkOrder.get(woId) ?? level, level));
    });

    levelByWorkOrder.forEach((level, woId) =>
        map.set(woId, STATUS_BY_LEVEL[level]),
    );

    return map;
};

module.exports = { MATERIAL_STATUS, getMaterialStatusMap };