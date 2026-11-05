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
// ===========================================================================
// BULK IMPORT HELPERS
// ===========================================================================

// true  => Excel ka Item Name Item Master ke naam se match hona chahiye
// false => sirf Item Code check hoga (name bas required rahega)
const STRICT_NAME_MATCH = true;

const cleanStr = (v) => String(v ?? "").trim();
const normName = (v) => cleanStr(v).replace(/\s+/g, " ").toLowerCase();

// TODO: Yahan wahi formula paste karo jo frontend me Weight (kg) nikalta hai.
// dims = { thickness, length, width } (numbers), qty = number
// Jab tak paste nahi hota, null return hoga (weight save nahi hoga).
const calculateWeight = (dims, qty) => {
  return null;
};

const toStr = (v) =>
  v === undefined || v === null || v === "" || Number(v) === 0
    ? null
    : String(v);

// Excel me L/W/T hain to wahi lo, nahi hain to Item Master ke values lo
// true  => qty parent chain se multiply hogi (axle 1 > item kp 4 > item last 3 => 1x4x3 = 12)
// false => sirf us row ki apni qty (item last = 3)
const MULTIPLY_PARENT_QTY = false;

const round3 = (n) => String(Number(n.toFixed(3)));

// Excel me L/W/T hain to wahi lo, nahi hain to Item Master ke values lo.
// Weight = unit weight x total qty
const resolveDims = (r, master, totalQty) => {
  const masterUnitWt = Number(master && master.weight) || 0;
  const masterWeightTotal =
    masterUnitWt > 0 ? round3(masterUnitWt * totalQty) : null;

  const hasManual = r.length > 0 || r.width > 0 || r.thickness > 0;

  if (hasManual) {
    const dims = {
      thickness: r.thickness,
      length: r.length,
      width: r.width,
    };
    const w = calculateWeight(dims, totalQty);
    return {
      thickness: toStr(dims.thickness),
      length: toStr(dims.length),
      width: toStr(dims.width),
      // formula paste nahi hua to Item Master weight x qty
      weight:
        w === null || w === undefined ? masterWeightTotal : String(w),
    };
  }

  // Excel me L/W/T khali => Item Master se
  return {
    thickness: toStr(master && master.thickness),
    length: toStr(master && master.length),
    width: toStr(master && master.width),
    weight: masterWeightTotal,
  };
};

// Company ke itemmaster rows ka Map(itemCode -> row)
const getItemMasterByCode = async (companyId) => {
  const rows = await selectWithJoins(
    "itemmaster",
    [],
    { companyId, delete: 0 },
    [
      "itemId",
      "itemCode",
      "itemName",
      "unit",
      "thickness",
      "length",
      "width",
      "weight",
    ],
  );
  return new Map(rows.map((r) => [cleanStr(r.itemCode), r]));
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

    const { bomName, bomCode, status, items, finishedGoodsItemId } = req.body;

    if (!finishedGoodsItemId) {
      await t.rollback();
      return errorResponse(res, "Finished Goods Item is required.");
    }

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
        finishedGoodsItemId: finishedGoodsItemId || null,
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
const bulkImportBom = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const companyId = req.companyId;
    if (!companyId) {
      await t.rollback();
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { boms } = req.body;

    const codeMap = await getItemMasterByCode(companyId);
    const errors = [];

    // ---- Item check (code + name required, DB me hona chahiye) ----
    // Same (code, name) jodi ek hi baar check hoti hai taaki error repeat na ho.
     const cache = new Map();
    const checkItem = (code, name, label, strict = STRICT_NAME_MATCH) => {
      const key = `${code}||${normName(name)}||${strict}`;
      if (cache.has(key)) return cache.get(key);

      let result = null;
      if (!code) {
        errors.push({ row: label, reason: "Item Code is required" });
      } else if (!name) {
        errors.push({
          row: label,
          reason: `Item Name is required for item code "${code}"`,
        });
      } else {
        const master = codeMap.get(code);
        if (!master) {
          errors.push({
            row: label,
            reason: `Item "${code}" not found in Item Master`,
          });
        } else if (strict && normName(master.itemName) !== normName(name)) {
          errors.push({
            row: label,
            reason: `Item Name "${name}" does not match Item Master name "${master.itemName}" for code "${code}"`,
          });
        } else {
          result = master;
        }
      }
      cache.set(key, result);
      return result;
    };

    // ---- Flat rows -> nested children (cycle safe) ----
       const buildChildren = (parentCode, childrenMap, path, parentQty = 1) => {
      const rows = childrenMap.get(parentCode) || [];
      const nextPath = new Set(path);
      nextPath.add(parentCode);
      const out = [];

      for (const r of rows) {
        if (nextPath.has(r.childCode)) {
          errors.push({
            row: r.label,
            reason: `Circular reference: "${r.childCode}" is already a parent above it`,
          });
          continue;
        }

        const master = codeMap.get(r.childCode);
        const totalQty = MULTIPLY_PARENT_QTY ? parentQty * r.qty : r.qty;
        const dims = resolveDims(r, master, totalQty);

        out.push({
          refItemId: master ? master.itemId : null,
          quantity: String(r.qty),
          unit: r.uom || (master && master.unit) || null,
          serialNo: r.serialNo ? String(r.serialNo) : null,
          thickness: dims.thickness,
          length: dims.length,
          width: dims.width,
          weight: dims.weight,
          status: "active",
          children: buildChildren(r.childCode, childrenMap, nextPath, totalQty),
        });
      }
      return out;
    };
    // ---- Har BOM ko validate karke tree banao ----
    const prepared = [];
    const seenBomCodes = new Set();

    for (const bom of boms) {
      const bomCode = cleanStr(bom.bomCode);
      const rootCode = cleanStr(bom.itemCode);

      if (seenBomCodes.has(bomCode)) {
        errors.push({
          row: bomCode,
          reason: `BOM Code "${bomCode}" is repeated in the file`,
        });
        continue;
      }
      seenBomCodes.add(bomCode);

      const rows = (bom.components || []).map((c) => {
        const parentCode = cleanStr(c.parentCode);
        const childCode = cleanStr(c.childCode);
        return {
          parentCode,
          parentName: cleanStr(c.parentName),
          childCode,
          childName: cleanStr(c.childName),
          serialNo: Number(c.serialNo) || 0,
          uom: cleanStr(c.uom),
          qty: Number(c.qty) || 1,
          length: Number(c.length) || 0,
          width: Number(c.width) || 0,
          thickness: Number(c.thickness) || 0,
          label: `${parentCode} > ${childCode}`,
        };
      });

      // Parent aur Child dono ka code + name DB se check
          for (const r of rows) {
        checkItem(r.parentCode, r.parentName, r.label, false); // parent: code DB me ho, naam bas diya ho
        checkItem(r.childCode, r.childName, r.label); // child: naam bhi match hona chahiye
      }

      // Root item (Excel me jo kisi ka child nahi hai)
      const rootRow = rows.find((r) => r.parentCode === rootCode);
      const rootName = rootRow ? rootRow.parentName : "";
      const rootMaster = checkItem(rootCode, rootName, bomCode, false);

      // Parent -> children map (serialNo ke order me)
      const childrenMap = new Map();
      rows.forEach((r) => {
        if (!childrenMap.has(r.parentCode)) childrenMap.set(r.parentCode, []);
        childrenMap.get(r.parentCode).push(r);
      });
      childrenMap.forEach((list) =>
        list.sort((a, b) => a.serialNo - b.serialNo),
      );

      const children = buildChildren(rootCode, childrenMap, new Set());

      if (rootMaster) {
        prepared.push({
          bomCode,
          bomName: cleanStr(bom.bomName) || rootName || bomCode,
          status:
            String(bom.status || "active").toLowerCase() === "inactive"
              ? "inactive"
              : "active",
          finishedGoodsItemId: rootMaster.itemId,
          items: [
            {
              refItemId: rootMaster.itemId,
              quantity: "1",
              unit: rootMaster.unit || null,
              serialNo: null,
              status: "active",
              children,
            },
          ],
        });
      }
    }

    // ---- Duplicate bomCode (DB me pehle se) ----
    if (seenBomCodes.size > 0) {
      const existing = await Bom.findAll({
        where: { companyId, bomCode: Array.from(seenBomCodes), delete: 0 },
        attributes: ["bomCode"],
        raw: true,
        transaction: t,
      });
      existing.forEach((b) =>
        errors.push({
          row: b.bomCode,
          reason: `BOM Code "${b.bomCode}" already exists`,
        }),
      );
    }

    // ---- Koi bhi error => poora import reject ----
    if (errors.length > 0) {
      await t.rollback();
      return errorResponse(
        res,
        `Import rejected: ${errors.length} problem(s) found.`,
        errors,
      );
    }

    // ---- Sab sahi: insert ----
    for (const p of prepared) {
      const header = await Bom.create(
        {
          companyId,
          finishedGoodsItemId: p.finishedGoodsItemId,
          bomName: p.bomName,
          bomCode: p.bomCode,
          status: p.status,
          createdBy: req.employeeId || null,
          delete: 0,
        },
        { transaction: t },
      );
      await insertTree(p.items, header.bomId, null, t);
    }

    await t.commit();
    return successResponse(
      res,
      { imported: prepared.length },
      `${prepared.length} BOM(s) imported successfully.`,
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

    const { bomId, bomName, bomCode, status, items, finishedGoodsItemId } =
      req.body;

    if (!finishedGoodsItemId) {
      await t.rollback();
      return errorResponse(res, "Finished Goods Item is required.");
    }

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
      {
        bomName,
        bomCode,
        status: status || "active",
        // finishedGoodsItemId: finishedGoodsItemId ?? header.finishedGoodsItemId,
        finishedGoodsItemId: finishedGoodsItemId,
        updated: new Date(),
      },
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

// ---------------- GET SUB BOM CHILDREN BY ITEM CODE (full nested tree) ----------------
// Finds the given item code as a NODE anywhere inside any of this
// company's BOM trees (it doesn't need to be a root/Finished-Goods
// item with its own separate bomCode) and returns that node's FULL
// nested subtree (all descendants, not just direct children) so the
// drawer can render it exactly like the main BOM Structure panel.
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

    // Step 1: resolve the item code to an itemId
    const itemRows = await selectWithJoins(
      "itemmaster",
      [],
      { itemCode: code, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "unit"],
    );

    if (itemRows.length === 0) {
      return errorResponse(
        res,
        `Item code "${code}" not found in Item Master.`,
      );
    }

    const targetItem = itemRows[0];

    // Step 2: all BOMs belonging to this company (scope search)
    const companyBoms = await Bom.findAll({
      where: { companyId, delete: 0 },
      attributes: ["bomId"],
      raw: true,
    });
    const bomIds = companyBoms.map((b) => b.bomId);

    if (bomIds.length === 0) {
      return errorResponse(
        res,
        `Item "${code}" was not found inside any existing BOM.`,
      );
    }

    // Step 3: find every occurrence of this item as a node in any
    // of the company's BOM trees (root OR nested — parentId doesn't
    // matter here)
    const matchingNodes = await BomItem.findAll({
      where: { bomId: bomIds, itemId: targetItem.itemId, delete: 0 },
      raw: true,
    });

    if (matchingNodes.length === 0) {
      return errorResponse(
        res,
        `Item "${code}" was not found inside any existing BOM.`,
      );
    }

    // Step 4: among all occurrences, pick the most recent one that
    // actually has children (an item might be a plain leaf in one
    // BOM and a sub-assembly with children in another)
    const sortedNodes = [...matchingNodes].sort(
      (a, b) => b.bomItemId - a.bomItemId,
    );

    let chosenNode = null;

    for (const node of sortedNodes) {
      const childCount = await BomItem.count({
        where: { parentId: node.bomItemId, delete: 0 },
      });
      if (childCount > 0) {
        chosenNode = node;
        break;
      }
    }

    if (!chosenNode) {
      return errorResponse(
        res,
        `Item "${code}" exists in a BOM, but has no child items under it.`,
      );
    }

    // Step 5: fetch every row belonging to that BOM (the whole tree,
    // not just this node's direct children) so buildTree can recurse
    // down through every depth beneath the chosen node.
    const allRowsForBom = await BomItem.findAll({
      where: { bomId: chosenNode.bomId, delete: 0 },
      raw: true,
    });

    const itemMap = await getItemMasterMap(companyId);

    // buildTree is the same helper used by getBomById — reused here
    // to build the full nested subtree rooted at chosenNode, so the
    // drawer gets real multi-level children instead of one flat level.
    const items = buildTree(allRowsForBom, itemMap, chosenNode.bomItemId);

    // Step 6: return — bomCode/bomName here describe the ITEM itself
    // (not a separate root BOM record), since that's what the drawer
    // header shows
    return successResponse(
      res,
      {
        bomId: chosenNode.bomId,
        bomCode: targetItem.itemCode,
        bomName: targetItem.itemName,
        status: chosenNode.status || "active",
        items,
      },
      "Sub BOM children fetched successfully",
    );
  } catch (error) {
    console.error("getSubBomById Error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST SUB BOM (items that have children somewhere) ----------------
const getSubBomList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    // All company BOMs
    const headers = await Bom.findAll({
      where: { companyId, delete: 0 },
      attributes: ["bomId", "bomCode", "bomName", "status", "created"],
      raw: true,
    });

    if (headers.length === 0)
      return successResponse(res, [], "Sub BOM list fetched successfully");

    const bomIds = headers.map((h) => h.bomId);
    const headerMap = Object.fromEntries(headers.map((h) => [h.bomId, h]));

    // All non-root items (these are the "sub" entries)
    const childItems = await BomItem.findAll({
      where: {
        bomId: bomIds,
        parentId: { [db.Sequelize.Op.ne]: null }, // not root
        delete: 0,
      },
      order: [["bomItemId", "DESC"]],
      raw: true,
    });

    if (childItems.length === 0)
      return successResponse(res, [], "Sub BOM list fetched successfully");

    const itemMap = await getItemMasterMap(companyId);

    // One row per child occurrence (you can later group by itemId if you want unique items only)
    const list = childItems.map((it) => {
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

    return successResponse(res, list, "Sub BOM list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createBom,
    bulkImportBom,
  getBomList,
  getBomById,
  updateBom,
  deleteBom,
  checkItemCodeExists,
  getSubBomById,
  getSubBomList,
};
