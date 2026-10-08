const { selectWithJoins } = require("./index.js");
const { getLeadMapBySalesOrder } = require("./leadDetails.js");
const { WORK_ORDER_STAGES } = require("./workOrderStages.js");
const db = require("../modelses");

// Same resolution Material Availability uses: finishedGoodsItemId first,
// then BOM name == product name as a fallback.
const resolveBom = async (companyId, modelItemId) => {
    const bom = await db.bom.findOne({
        where: { companyId, finishedGoodsItemId: Number(modelItemId), delete: 0 },
        order: [["bomId", "DESC"]],
        raw: true,
    });
    if (bom) return bom;

    const productRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: Number(modelItemId), companyId, delete: 0 },
        ["itemId", "itemName"],
    );
    const productName = productRows[0]?.itemName?.trim();
    if (!productName) return null;

    return db.bom.findOne({
        where: {
            companyId,
            delete: 0,
            bomName: { [db.Sequelize.Op.iLike]: productName },
        },
        order: [["bomId", "DESC"]],
        raw: true,
    });
};

// -> { error } or { workOrder, bom, items }
const getStageItems = async ({ companyId, workOrderId, stageKey }) => {
    const stage = WORK_ORDER_STAGES.find((s) => s.key === stageKey);
    if (!stage || !stage.categoryStage) {
        return { error: "Invalid stage." };
    }

    const woRows = await selectWithJoins(
        "workorder",
        [],
        { workOrderId, companyId, delete: 0 },
        ["workOrderId", "workOrderNo", "salesOrderId", "financialYearId", "model"],
    );
    if (!woRows.length) return { error: "Work Order not found." };
    const workOrder = woRows[0];

    // live model from the lead, like Material Availability
    const leadMap = await getLeadMapBySalesOrder([workOrder.salesOrderId], companyId);
    const lead = leadMap.get(String(workOrder.salesOrderId));
    const modelId = (lead && lead.model) || workOrder.model;
    if (!modelId) {
        return { error: "This Work Order has no product linked, so no BOM can be resolved." };
    }

    const bom = await resolveBom(companyId, modelId);
    if (!bom) return { error: "No BOM found for this Work Order's product." };

    // categories mapped to this stage (Settings > Item Category)
    const stageCategories = await selectWithJoins(
        "itemcategorystage",
        [],
        {
            companyId,
            financialYearId: workOrder.financialYearId,
            stage: stage.categoryStage,
            delete: 0,
        },
        ["categoryId"],
    );
    const categoryIds = [...new Set(stageCategories.map((c) => Number(c.categoryId)))];
    if (!categoryIds.length) return { workOrder, bom, items: [] };

    // Only the parent / finished-goods item decides if this stage is relevant.
    // Child BOM items are never filtered by category.
    const parentRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: Number(modelId), companyId, delete: 0 },
        ["itemId", "itemCategoryId"],
    );
    const parentCategoryId = parentRows[0] ? Number(parentRows[0].itemCategoryId) : null;
    if (!parentCategoryId || !categoryIds.includes(parentCategoryId)) {
        return { workOrder, bom, items: [] };
    }

    const bomRows = await db.bomItem.findAll({
        where: { bomId: bom.bomId, delete: 0 },
        order: [["sortOrder", "ASC"], ["bomItemId", "ASC"]],
        raw: true,
    });
    if (!bomRows.length) return { workOrder, bom, items: [] };

    // Only leaf items (real components). Parents/assemblies are excluded.
    const parentIds = new Set(
        bomRows
            .map((r) => r.parentId)
            .filter((id) => id != null)
            .map(Number),
    );
    const leafRows = bomRows.filter((r) => !parentIds.has(Number(r.bomItemId)));
    if (!leafRows.length) return { workOrder, bom, items: [] };

    const itemIds = [...new Set(leafRows.map((r) => Number(r.itemId)))];

    // All children — no category filter
    const itemDetails = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: itemIds, companyId, delete: 0 },
        ["itemId", "itemCode", "itemName", "hsnCode", "unit", "itemCategoryId"],
    );

    const allCategoryIds = [
        ...new Set(itemDetails.map((i) => Number(i.itemCategoryId)).filter(Boolean)),
    ];
    const categories = allCategoryIds.length
        ? await selectWithJoins(
            "itemcategory",
            [],
            { itemCategoryId: allCategoryIds, companyId, delete: 0 },
            ["itemCategoryId", "categoryName"],
        )
        : [];
    const categoryName = new Map(
        categories.map((c) => [Number(c.itemCategoryId), c.categoryName]),
    );
    const itemMap = new Map(itemDetails.map((i) => [Number(i.itemId), i]));

    const items = leafRows
        .filter((r) => itemMap.has(Number(r.itemId)))
        .map((r) => {
            const item = itemMap.get(Number(r.itemId));
            return {
                bomItemId: r.bomItemId,
                itemId: r.itemId,
                itemCode: item.itemCode || "",
                itemName: item.itemName || "",
                hsnCode: item.hsnCode || "",
                category: categoryName.get(Number(item.itemCategoryId)) || "",
                unit: r.unit || item.unit || "",
                quantity: r.quantity ?? "",
            };
        });

    return { workOrder, bom, items };
};

module.exports = { getStageItems };