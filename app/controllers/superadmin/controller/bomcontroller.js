const {
  successResponse,
  errorResponse,
  requiredmessage,
  selectWithJoins,
} = require("../../../helper/index.js");

// Apne project ke models/index.js (Sequelize) se db object import karo.
// Path apne folder structure ke hisaab se adjust kar lena.
const db = require("../../../modelses");
const Bom = db.bom;
const BomItem = db.bomItem;
const sequelize = db.sequelize;

// ---------------------------------------------------------------------------
// STEP 1: Poore tree me se saare refItemId nikaal lo (root + saare children,
// kitni bhi depth ho). Ye Set banata hai taaki duplicate ids ek hi baar
// check ho.
// ---------------------------------------------------------------------------
const collectRefItemIds = (nodes, set) => {
  for (const node of nodes) {
    if (node.refItemId) set.add(Number(node.refItemId));
    if (node.children && node.children.length > 0) {
      collectRefItemIds(node.children, set);
    }
  }
};

// ---------------------------------------------------------------------------
// STEP 2: Har node ka refItemId itemMap (jo sirf company ke active/valid
// itemmaster records se bana hai) me exist karta hai ya nahi — check karo.
// Jahan bhi na mile wahan error push karo (row/itemCode ke saath) taaki
// user ko exact pata chale kaunsa item galat tha.
// Reject-the-whole-thing pattern — aapke bulkImportItemMaster jaisa hi.
// ---------------------------------------------------------------------------
const validateTreeAgainstItemMaster = (
  nodes,
  itemMap,
  errors,
  pathLabel = "",
) => {
  nodes.forEach((node, idx) => {
    const label = pathLabel
      ? `${pathLabel} > ${node.itemCode || node.refItemId}`
      : node.itemCode || `item #${idx + 1}`;
    const master = itemMap.get(Number(node.refItemId));

    if (!master) {
      errors.push({
        itemCode: node.itemCode || null,
        refItemId: node.refItemId,
        reason: `Item "${node.itemCode || node.refItemId}" not found in Item Master (may be deleted, inactive, or belongs to another company)`,
      });
    }

    if (node.children && node.children.length > 0) {
      validateTreeAgainstItemMaster(node.children, itemMap, errors, label);
    }
  });
};

// ---------------------------------------------------------------------------
// STEP 3: Validation pass ho jaane ke baad, actual DB insert. Root pehle
// insert hota hai, uska naya bomItemId milta hai, wahi children ka parentId
// banta hai (recursive) — sirf itemId store hota hai, itemCode/itemName
// kabhi nahi.
// ---------------------------------------------------------------------------
const insertTree = async (nodes, bomId, parentId, transaction) => {
  let order = 0;
  for (const node of nodes) {
    const row = await BomItem.create(
      {
        bomId,
        parentId, // null for root level
        itemId: Number(node.refItemId), // 👈 sirf id store
        quantity: node.quantity || null,
        unit: node.unit || null,
        serialNo: node.serialNo || null,
        asslyQty: node.asslyQty || null,
        ldDay: node.ldDay || null,
        psNo: node.psNo || null,
        rejPct: node.rejPct || null,
        pkgNo: node.pkgNo || null,
        mfgCd: node.mfgCd || null,
        modDate: node.modDate || null,
        person: node.person || null,
        status: node.status || "active",
        dtlNo: node.dtlNo || null,
        shapeDim: node.shapeDim || null,
        finQtty: node.finQtty || null,
        shape: node.shape || null,
        thickness: node.thickness || null,
        length: node.length || null,
        width: node.width || null,
        weight: node.weight || null,
        sortOrder: order++,
        delete: 0,
      },
      { transaction },
    );

    if (node.children && node.children.length > 0) {
      await insertTree(node.children, bomId, row.bomItemId, transaction);
    }
  }
};

// ---------------------------------------------------------------------------
// Flat DB rows -> nested tree (frontend BOMItem[] shape). itemCode/itemName
// yahan itemmaster se live fetched masterMap se liye jaate hain, kyunki
// bomitem me wo store hi nahi hote.
// ---------------------------------------------------------------------------
const buildTree = (rows, masterMap, parentId = null) => {
  return rows
    .filter((r) => r.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => {
      const master = masterMap.get(Number(r.itemId)) || {};
      return {
        id: String(r.bomItemId),
        refItemId: r.itemId,
        itemCode: master.itemCode || "(item not found)",
        itemName: master.itemName || "",
        quantity: r.quantity,
        unit: r.unit,
        serialNo: r.serialNo,
        asslyQty: r.asslyQty,
        ldDay: r.ldDay,
        psNo: r.psNo,
        rejPct: r.rejPct,
        pkgNo: r.pkgNo,
        mfgCd: r.mfgCd,
        modDate: r.modDate,
        person: r.person,
        status: r.status,
        dtlNo: r.dtlNo,
        shapeDim: r.shapeDim,
        finQtty: r.finQtty,
        shape: r.shape,
        thickness: r.thickness,
        length: r.length,
        width: r.width,
        weight: r.weight,
        children: buildTree(rows, masterMap, r.bomItemId),
      };
    });
};

// Company ke saare active itemmaster rows ka Map(itemId -> row) banata hai.
// (Pattern bilkul aapke bulkImportItemMaster jaisa — pehle poori list utha
// lo, phir memory me match karo — bina IN-clause helper pe depend kiye.)
const getItemMasterMap = async (companyId) => {
  const rows = await selectWithJoins(
    "itemmaster",
    [],
    { companyId, delete: 0 },
    ["itemId", "itemCode", "itemName", "unit"],
  );
  return new Map(rows.map((r) => [Number(r.itemId), r]));
};

// ---------------- CREATE ----------------
const createBom = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const companyId = req.companyId;
    if (!companyId) {
      await t.rollback();
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { bomName, bomCode, status, items } = req.body;

    // duplicate bomCode check (company level)
    const existing = await Bom.findOne({
      where: { companyId, bomCode, delete: 0 },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return errorResponse(res, "BOM Code already exists.");
    }

    // ---- Har item ka refItemId Item Master me exist karta hai ya nahi ----
    const itemMap = await getItemMasterMap(companyId);
    const errors = [];
    validateTreeAgainstItemMaster(items, itemMap, errors);

    if (errors.length > 0) {
      await t.rollback();
      return errorResponse(
        res,
        `BOM rejected: ${errors.length} item(s) not found in Item Master.`,
        errors,
      );
    }

    const header = await Bom.create(
      {
        companyId,
        bomName,
        bomCode,
        status: status || "active",
        createdBy: req.employeeId || null,
        delete: 0,
      },
      { transaction: t },
    );

    await insertTree(items, header.bomId, null, t);

    await t.commit();
    return successResponse(
      res,
      { bomId: header.bomId },
      "BOM created successfully",
    );
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (flat, one row per item — for table view) ----------------
const getBomList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const headers = await Bom.findAll({
      where: { companyId, delete: 0 },
      order: [["bomId", "DESC"]],
      raw: true,
    });

    if (headers.length === 0)
      return successResponse(res, [], "BOM list fetched successfully");

    const bomIds = headers.map((h) => h.bomId);

    // 👇 FIX 2: only fetch ROOT items (parentId: null) — this is what makes the
    // table show "the parent item" instead of every child row too.
    const rootItems = await BomItem.findAll({
      where: { bomId: bomIds, parentId: null, delete: 0 },
      order: [["sortOrder", "ASC"]],
      raw: true,
    });

    const headerMap = Object.fromEntries(headers.map((h) => [h.bomId, h]));
    const itemMap = await getItemMasterMap(companyId);

    // One row per root item (normally = one row per BOM, unless a BOM has
    // multiple root items, in which case each root gets its own row).
    const list = rootItems.map((it) => {
      const h = headerMap[it.bomId] || {};
      const master = itemMap.get(Number(it.itemId)) || {};
      return {
        id: String(it.bomItemId),
        bomId: it.bomId,
        itemName: master.itemName || "(item not found)",
        itemCode: master.itemCode || "-",
        bomCode: h.bomCode,
        bomName: h.bomName,
        quantity: it.quantity,
        unit: it.unit || master.unit,
        status: h.status,
        created: h.created,
      };
    });

    return successResponse(res, list, "BOM list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (full nested tree, for Edit page) ----------------
const getBomById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const header = await Bom.findOne({
      where: { bomId: id, companyId, delete: 0 },
      raw: true,
    });
    if (!header) return requiredmessage(res, "BOM not found");

    const rows = await BomItem.findAll({
      where: { bomId: id, delete: 0 },
      raw: true,
    });

    const itemMap = await getItemMasterMap(companyId);
    const tree = buildTree(rows, itemMap, null);

    return successResponse(
      res,
      {
        bomId: header.bomId,
        bomName: header.bomName,
        bomCode: header.bomCode,
        status: header.status,
        items: tree,
      },
      "BOM fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE (replace whole tree — simplest & safest) ----------------
const updateBom = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const companyId = req.companyId;
    if (!companyId) {
      await t.rollback();
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { bomId, bomName, bomCode, status, items } = req.body;

    const header = await Bom.findOne({
      where: { bomId, companyId, delete: 0 },
      transaction: t,
    });
    if (!header) {
      await t.rollback();
      return requiredmessage(res, "BOM not found");
    }

    // ---- Har item ka refItemId Item Master me exist karta hai ya nahi ----
    const itemMap = await getItemMasterMap(companyId);
    const errors = [];
    validateTreeAgainstItemMaster(items, itemMap, errors);

    if (errors.length > 0) {
      await t.rollback();
      return errorResponse(
        res,
        `BOM update rejected: ${errors.length} item(s) not found in Item Master.`,
        errors,
      );
    }

    await header.update(
      { bomName, bomCode, status: status || "active", updated: new Date() },
      { transaction: t },
    );

    // Purana tree soft-delete karke naya tree fresh insert karo — isse
    // parentId re-mapping ka jhanjhat nahi rehta.
    await BomItem.update(
      { delete: 1, updated: new Date() },
      { where: { bomId }, transaction: t },
    );

    await insertTree(items, bomId, null, t);

    await t.commit();
    return successResponse(res, {}, "BOM updated successfully");
  } catch (error) {
    await t.rollback();
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete header + all items) ----------------
const deleteBom = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const companyId = req.companyId;
    if (!companyId) {
      await t.rollback();
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { bomId } = req.body;
    const header = await Bom.findOne({
      where: { bomId, companyId, delete: 0 },
      transaction: t,
    });
    if (!header) {
      await t.rollback();
      return requiredmessage(res, "BOM not found");
    }

    await header.update({ delete: 1, updated: new Date() }, { transaction: t });
    await BomItem.update(
      { delete: 1, updated: new Date() },
      { where: { bomId }, transaction: t },
    );

    await t.commit();
    return successResponse(res, {}, "BOM deleted successfully");
  } catch (error) {
    await t.rollback();
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- CHECK ITEM CODE (live validation while typing) ----------------
// Frontend "Parent"/"Child" input me har baar type karte waqt is endpoint ko
// hit kar sakte ho taaki user ko turant pata chale item exist karta hai ya
// nahi. (Optional — availableItems list se bhi client-side check ho raha
// hai, ye extra server-confirmed check hai.)
const checkItemCodeExists = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { code } = req.params;
    const rows = await selectWithJoins(
      "itemmaster",
      [],
      { itemCode: (code || "").trim(), companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "unit"],
    );

    if (rows.length === 0) {
      return successResponse(res, { exists: false }, "Item not found");
    }

    return successResponse(res, { exists: true, item: rows[0] }, "Item found");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};



// ---------------- GET SUB BOM CHILDREN BY BOM ID ----------------
// ---------------- GET SUB BOM CHILDREN BY ITEM CODE ----------------
// Finds the given item code as a NODE anywhere inside any of this
// company's BOM trees (it doesn't need to be a root/Finished-Goods
// item with its own separate bomCode) and returns that node's direct
// children. If the item appears in more than one place, we pick the
// most recently created occurrence that actually has children.
const getSubBomById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;
    const code = String(id || "").trim();

    if (!code) {
      return requiredmessage(res, "Item code is required");
    }

    // ---------------------------------------------------------
    // STEP 1: resolve the item code to an itemId
    // ---------------------------------------------------------
    const itemRows = await selectWithJoins(
      "itemmaster",
      [],
      { itemCode: code, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "unit"],
    );

    if (itemRows.length === 0) {
      return errorResponse(res, `Item code "${code}" not found in Item Master.`);
    }

    const targetItem = itemRows[0];

    // ---------------------------------------------------------
    // STEP 2: all BOMs belonging to this company (scope search)
    // ---------------------------------------------------------
    const companyBoms = await Bom.findAll({
      where: { companyId, delete: 0 },
      attributes: ["bomId"],
      raw: true,
    });
    const bomIds = companyBoms.map((b) => b.bomId);

    if (bomIds.length === 0) {
      return errorResponse(
        res,
        `Item "${code}" was not found inside any existing BOM.`
      );
    }

    // ---------------------------------------------------------
    // STEP 3: find every occurrence of this item as a node in any
    // of the company's BOM trees (root OR nested — parentId doesn't
    // matter here)
    // ---------------------------------------------------------
    const matchingNodes = await BomItem.findAll({
      where: { bomId: bomIds, itemId: targetItem.itemId, delete: 0 },
      raw: true,
    });

    if (matchingNodes.length === 0) {
      return errorResponse(
        res,
        `Item "${code}" was not found inside any existing BOM.`
      );
    }

    // ---------------------------------------------------------
    // STEP 4: among all occurrences, pick the most recent one that
    // actually has children (an item might be a plain leaf in one
    // BOM and a sub-assembly with children in another)
    // ---------------------------------------------------------
    const sortedNodes = [...matchingNodes].sort(
      (a, b) => b.bomItemId - a.bomItemId,
    );

    let chosenNode = null;
    let chosenChildren = [];

    for (const node of sortedNodes) {
      const children = await BomItem.findAll({
        where: { parentId: node.bomItemId, delete: 0 },
        order: [["sortOrder", "ASC"]],
        raw: true,
      });
      if (children.length > 0) {
        chosenNode = node;
        chosenChildren = children;
        break;
      }
    }

    if (!chosenNode) {
      return errorResponse(
        res,
        `Item "${code}" exists in a BOM, but has no child items under it.`
      );
    }

    // ---------------------------------------------------------
    // STEP 5: build the flat children list for the drawer
    // ---------------------------------------------------------
    const itemMap = await getItemMasterMap(companyId);

    const items = chosenChildren.map((row) => {
      const master = itemMap.get(Number(row.itemId)) || {};
      return {
        id: String(row.bomItemId),
        refItemId: row.itemId,
        itemCode: master.itemCode || "(item not found)",
        itemName: master.itemName || "",
        quantity: row.quantity,
        unit: row.unit || master.unit || null,
        serialNo: row.serialNo,
        asslyQty: row.asslyQty,
        ldDay: row.ldDay,
        psNo: row.psNo,
        rejPct: row.rejPct,
        pkgNo: row.pkgNo,
        mfgCd: row.mfgCd,
        modDate: row.modDate,
        person: row.person,
        status: row.status,
        dtlNo: row.dtlNo,
        shapeDim: row.shapeDim,
        finQtty: row.finQtty,
        shape: row.shape,
        thickness: row.thickness,
        length: row.length,
        width: row.width,
        weight: row.weight,
        children: [],
      };
    });

    // ---------------------------------------------------------
    // STEP 6: return — bomCode/bomName here describe the ITEM
    // itself (not a separate root BOM record), since that's what
    // the drawer header shows
    // ---------------------------------------------------------
    return successResponse(
      res,
      {
        bomId: chosenNode.bomId,
        bomCode: targetItem.itemCode,
        bomName: targetItem.itemName,
        status: chosenNode.status || "active",
        items,
      },
      "Sub BOM children fetched successfully"
    );
  } catch (error) {
    console.error("getSubBomById Error:", error);
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error
    );
  }
};

module.exports = {
  createBom,
  getBomList,
  getBomById,
  updateBom,
  deleteBom,
  checkItemCodeExists,
  getSubBomById,
};
