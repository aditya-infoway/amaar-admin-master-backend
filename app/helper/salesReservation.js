const { selectWithJoins } = require("./index.js");
const { getLeadMapBySalesOrder } = require("./leadDetails.js");
const db = require("../modelses");

const Bom = db.bom;
const BomItem = db.bomItem;
const { Op } = db.Sequelize;

const round2 = (v) => Number(Number(v || 0).toFixed(2));

// leaf = no other row in the same BOM points at it via parentId
const getLeafBomItems = (rows) => {
  const parentIds = new Set(
    rows.map((r) => r.parentId).filter((id) => id !== null && id !== undefined),
  );
  return rows.filter((r) => !parentIds.has(r.bomItemId));
};

const resolveBom = async (companyId, modelId) => {
  let bom = await Bom.findOne({
    where: { companyId, finishedGoodsItemId: modelId, delete: 0 },
    raw: true,
  });
  if (bom) return bom;

  // same fallback as Material Availability: bomName == product itemName
  const rows = await selectWithJoins(
    "itemmaster", [],
    { itemId: modelId, companyId, delete: 0 },
    ["itemId", "itemName"],
  );
  const name = rows[0]?.itemName?.trim();
  if (!name) return null;

  return Bom.findOne({
    where: { companyId, delete: 0, bomName: { [Op.iLike]: name } },
    order: [["bomId", "DESC"]],
    raw: true,
  });
};

// One line per (sales order, leaf item): qty = BOM item qty x sales order qty.
// Pass { itemId } to keep only one item's lines.
const getSalesReservationLines = async (companyId, { itemId } = {}) => {
  const orders = await selectWithJoins(
    "salesorder", [],
    { companyId, delete: 0 },
    ["salesOrderId", "soNo", "qty", "created"],
  );
  if (orders.length === 0) return [];

  const leadMap = await getLeadMapBySalesOrder(
    orders.map((o) => o.salesOrderId),
    companyId,
  );

  const leafCache = new Map(); // modelId -> leaf bomitem rows
  const lines = [];
  const onlyItem = itemId ? Number(itemId) : null;

  for (const so of orders) {
    const lead = leadMap.get(String(so.salesOrderId));
    const modelId = Number(lead?.model);
    if (!modelId) continue;

    if (!leafCache.has(modelId)) {
      const bom = await resolveBom(companyId, modelId);
      let leaves = [];
      if (bom) {
        const all = await BomItem.findAll({
          where: { bomId: bom.bomId, delete: 0 },
          raw: true,
        });
        leaves = getLeafBomItems(all);
      }
      leafCache.set(modelId, leaves);
    }

    const soQty = Number(so.qty) || 0;
    const perItem = new Map(); // same item in two branches -> one line
    for (const leaf of leafCache.get(modelId)) {
      const q = (Number(leaf.quantity) || 0) * soQty;
      if (!q) continue;
      const id = Number(leaf.itemId);
      perItem.set(id, (perItem.get(id) || 0) + q);
    }

    const created = new Date(so.created);
    for (const [id, qty] of perItem) {
      if (onlyItem && id !== onlyItem) continue;
      lines.push({
        salesOrderId: so.salesOrderId,
        soNo: so.soNo || "",
        partyName: lead?.name || "",
        itemId: id,
        qty: round2(qty),
        date: created.toISOString().slice(0, 10),
        sortKey: created.toISOString(),
      });
    }
  }
  return lines;
};

module.exports = { getSalesReservationLines };