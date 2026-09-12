const {
  successResponse,
  errorResponse,
  requiredmessage,
  selectWithJoins,
} = require("../../../helper/index.js");

const db = require("../../../modelses");
const Bom = db.bom;
const BomItem = db.bomItem;

const round2 = (value) => Number(Number(value || 0).toFixed(2));

// ---------------------------------------------------------------------------
// Leaf rows only. A bomitem row belongs on Material Availability only if no
// OTHER row in the same BOM has parentId pointing at its bomItemId — that's
// what makes it a leaf ("file") instead of a folder/parent that just rolls
// up its children's Qty/Wt in the BOM Structure screen.
// ---------------------------------------------------------------------------
const getLeafBomItems = (rows) => {
  const parentIds = new Set(
    rows.map((r) => r.parentId).filter((id) => id !== null && id !== undefined),
  );
  return rows.filter((r) => !parentIds.has(r.bomItemId));
};

// ---------------- GET MATERIAL AVAILABILITY FOR A WORK ORDER ----------------
const getMaterialAvailability = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { workOrderId } = req.params;
    if (!workOrderId) return errorResponse(res, "Work Order id is required.");

    // ---- work order: model = finished goods itemId, qty = production qty ----
    const woRows = await selectWithJoins(
      "workorder",
      [],
      { workOrderId, companyId, delete: 0 },
      ["workOrderId", "workOrderNo", "customerName", "model", "qty"],
    );
    if (woRows.length === 0) return requiredmessage(res, "Work Order not found.");
    const workOrder = woRows[0];

    if (!workOrder.model) {
      return errorResponse(res, "This Work Order has no product linked, so no BOM can be resolved.");
    }

    // ---- resolve BOM from the work order's finished-goods item ----
    let bom = await Bom.findOne({
      where: { companyId, finishedGoodsItemId: Number(workOrder.model), delete: 0 },
      raw: true,
    });

    // Fallback: finishedGoodsItemId is currently null on every existing BOM
    // (createBom/updateBom never save it), and the BOM's root bomitem is just
    // the first component in the recipe tree — NOT the finished product, so
    // matching on that is wrong. What actually lines up in the real data is
    // bom.bomName == the product's itemName (e.g. BOM "fresh cow milk" for
    // product "fresh cow milk"). Fragile string match — replace with the
    // finishedGoodsItemId path once that's wired up on create/update.
    let productName = null;

    if (!bom) {
      const productRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: Number(workOrder.model), companyId, delete: 0 },
        ["itemId", "itemName"],
      );
      productName = productRows[0]?.itemName?.trim() || null;

      if (productName) {
        bom = await Bom.findOne({
          where: {
            companyId,
            delete: 0,
            bomName: { [db.Sequelize.Op.iLike]: productName },
          },
          order: [["bomId", "DESC"]],
          raw: true,
        });
      }
    }

    if (!bom) {
      // Debug payload so the mismatch is visible in the response itself —
      // remove this block once BOM linking is confirmed working.
      const allBoms = await Bom.findAll({
        where: { companyId, delete: 0 },
        attributes: ["bomId", "bomCode", "bomName", "finishedGoodsItemId"],
        raw: true,
      });

      return errorResponse(res, "No BOM found for this Work Order's product.", {
        workOrderProductId: Number(workOrder.model),
        workOrderProductName: productName,
        availableBoms: allBoms,
      });
    }

    const emptyResult = (extra = {}) =>
      successResponse(
        res,
        {
          workOrder: {
            workOrderId: workOrder.workOrderId,
            workOrderNo: workOrder.workOrderNo,
            customerName: workOrder.customerName,
          },
          bom: { bomId: bom.bomId, bomName: bom.bomName, bomCode: bom.bomCode },
          summary: { totalItems: 0, shortStock: 0 },
          rows: [],
          ...extra,
        },
        "Material availability fetched successfully",
      );

    // ---- full bom tree for this bom, then keep leaves only ----
    const allRows = await BomItem.findAll({
      where: { bomId: bom.bomId, delete: 0 },
      raw: true,
    });
    if (allRows.length === 0) return emptyResult();

    const leafRows = getLeafBomItems(allRows);
    if (leafRows.length === 0) return emptyResult();

    // ---- item master lookup: name/code/location/unit/openingStock ----
    // selectWithJoinsV2 doesn't handle array values in `where` correctly
    // (produces invalid SQL), so use plain selectWithJoins here — same as
    // getWorkOrderList's `{ itemId: modelIds }` pattern — and resolve
    // category names as a separate map-join, same two-step pattern used in
    // getPurchaseOrderList/getWorkOrderList.
    const itemIds = [...new Set(leafRows.map((r) => Number(r.itemId)))];

    const itemDetails = await selectWithJoins(
      "itemmaster",
      [],
      { itemId: itemIds, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "itemLocation", "unit", "openingStock", "itemCategoryId"],
    );

    const categoryIds = [...new Set(itemDetails.map((i) => i.itemCategoryId).filter(Boolean))];
    let categoryMap = new Map();
    if (categoryIds.length > 0) {
      const categories = await selectWithJoins(
        "itemcategory",
        [],
        { itemCategoryId: categoryIds, companyId, delete: 0 },
        ["itemCategoryId", "categoryName"],
      );
      categoryMap = new Map(categories.map((c) => [c.itemCategoryId, c.categoryName]));
    }

    const itemMap = new Map(
      itemDetails.map((i) => [
        Number(i.itemId),
        { ...i, categoryName: categoryMap.get(i.itemCategoryId) || "" },
      ]),
    );

    const productionQty = Number(workOrder.qty) || 1;

    // ---- one row per LEAF bom_item — duplicates (same item, different
    // branches of the tree) are kept as separate rows, not merged ----
    const rows = leafRows.map((li) => {
      const item = itemMap.get(Number(li.itemId));
      const availableStock = item ? Number(item.openingStock) || 0 : 0;
      const requiredStock = round2((Number(li.quantity) || 0) * productionQty);
      const purchaseRequired = round2(Math.max(requiredStock - availableStock, 0));

      return {
        bomItemId: li.bomItemId,
        itemId: li.itemId,
        itemCode: item ? item.itemCode : "(item not found)",
        itemName: item ? item.itemName : "(item not found)",
        itemLocation: item ? item.itemLocation || "" : "",
        category: item ? item.categoryName || "" : "",
        unit: item ? item.unit || "" : "",
        availableStock,
        requiredStock,
        purchaseRequired, // 0 = nothing to buy, >0 = qty still short
      };
    });

    const summary = {
      totalItems: rows.length,
      shortStock: rows.filter((r) => r.purchaseRequired > 0).length,
    };

    return successResponse(
      res,
      {
        workOrder: {
          workOrderId: workOrder.workOrderId,
          workOrderNo: workOrder.workOrderNo,
          customerName: workOrder.customerName,
        },
        bom: { bomId: bom.bomId, bomName: bom.bomName, bomCode: bom.bomCode },
        summary,
        rows,
      },
      "Material availability fetched successfully",
    );
  } catch (error) {
    console.error("getMaterialAvailability error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = { getMaterialAvailability };