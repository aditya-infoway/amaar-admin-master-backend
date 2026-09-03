const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
  selectWithJoinsV2,
} = require("../../../helper/index.js");

// ---------------- Barcode generator: ITM + company-wise sequential number ----------------
const generateBarcodeForCompany = async (companyId) => {
  const PREFIX = "ITM";
  const rows = await selectWithJoins(
    "itemmaster", [], { companyId, delete: 0 }, ["barcode"]
  );

  let maxNum = 0;
  rows.forEach((row) => {
    if (row.barcode && row.barcode.startsWith(PREFIX)) {
      const num = parseInt(row.barcode.slice(PREFIX.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  const next = maxNum + 1;
  return `${PREFIX}${String(next).padStart(7, "0")}`;
};

// ---------------- GET NEXT BARCODE (preview, form load ke waqt) ----------------
const getNextBarcode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const barcode = await generateBarcodeForCompany(companyId);
    return successResponse(res, { barcode }, "Barcode generated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- CREATE ----------------
const createItemMaster = async (req, res) => {

  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      itemCode, itemName, shortName, hsnCode, itemLocation,
      itemCategoryId, groupId, unit, taxSlab,
      thickness, length, width, weight,
      stockMapping, minQty, maxQty,
      // purchasePrice, actualPurchasePrice, salesPrice, mrp,
      barcodeType, barcode, status,
    } = req.body;

    // itemCode company-wise unique
    const codeExists = await selectWithJoins(
      "itemmaster", [], { itemCode: itemCode.trim(), companyId, delete: 0 }, ["itemId"]
    );
    if (codeExists.length > 0) {
      return errorResponse(res, "Item code already exists. Please enter a different code.");
    }

    // itemCategory company ka hi ho
    const categoryValid = await selectWithJoins(
      "itemcategory", [], { itemCategoryId, companyId, delete: 0 }, ["itemCategoryId"]
    );
    if (categoryValid.length === 0) {
      return errorResponse(res, "Selected item category is invalid.");
    }

    // group company ka hi ho
    const groupValid = await selectWithJoins(
      "itemgroup", [], { itemGroupId: groupId, companyId, delete: 0 }, ["itemGroupId"]
    );
    if (groupValid.length === 0) {
      return errorResponse(res, "Selected group is invalid.");
    }

    // ---- Barcode resolve karo — manual value ya server-generated ----
    let finalBarcode = "";
    if (barcodeType === "generate") {
      let attempts = 0;
      do {
        finalBarcode = await generateBarcodeForCompany(companyId);
        const clash = await selectWithJoins(
          "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
        );
        if (clash.length === 0) break;
        attempts++;
      } while (attempts < 5);
    } else {
      finalBarcode = (barcode || "").trim();
    }

    // barcode uniqueness — sirf tab check karo jab barcode non-empty ho
    // (Manually mode mein barcode optional/blank ho sakta hai, isliye blank ko skip karte hain)
    if (finalBarcode) {
      const barcodeExists = await selectWithJoins(
        "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
      );
      if (barcodeExists.length > 0) {
        return errorResponse(res, "This barcode is already in use. Please choose a different one.");
      }
    }

    const payload = {
      companyId,
      itemCode: itemCode.trim(),
      itemName: itemName.trim(),
      shortName: shortName.trim(),
      hsnCode: hsnCode.trim(),
      itemLocation: itemLocation || "",
      itemCategoryId,
      groupId,
      unit,
      taxSlab,
       thickness,
      length,
      width,
      weight,
      stockMapping: Boolean(stockMapping),
      minQty: stockMapping ? minQty : null,
      maxQty: stockMapping ? maxQty : null,
      // purchasePrice,
      // actualPurchasePrice,
      // salesPrice,
      // mrp,
      barcodeType,
      barcode: finalBarcode || null, // 👈 blank barcode ko NULL store karo (unique constraint safe)
      status: status || "active",
      delete: 0,
    };

    const item = await saveModel("itemmaster", payload);

    return successResponse(res, item, "Item created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This barcode or item code is already in use.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST (Category + Group name join) ----------------
const getItemMasterList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "itemmaster",
      [
        {
          table: "itemcategory",
          alias: "ic",
          onClause: { 'ic."itemCategoryId"': { "=": 'itemmaster."itemCategoryId"' } },
        },
        {
          table: "itemgroup",
          alias: "ig",
          onClause: { 'ig."itemGroupId"': { "=": 'itemmaster."groupId"' } },
        },
      ],
      {
        'itemmaster."companyId"': companyId,
        'itemmaster."delete"': 0,
      },
      [
        'itemmaster."itemId"',
        'itemmaster."itemCode"',
        'itemmaster."itemName"',
        'itemmaster."shortName"',
        'itemmaster."hsnCode"',
        'ic."categoryName" AS "categoryName"',
        'ig."groupName" AS "groupName"',
                 'itemmaster."unit"',
         'itemmaster."taxSlab"',
        'itemmaster."thickness"',
        'itemmaster."length"',
        'itemmaster."width"',
        'itemmaster."weight"',
         'itemmaster."stockMapping"',
        'itemmaster."minQty"',
        'itemmaster."maxQty"',
        // 'itemmaster."purchasePrice"',
        // 'itemmaster."actualPurchasePrice"',
        // 'itemmaster."salesPrice"',
        // 'itemmaster."mrp"',
        'itemmaster."barcodeType"',
        'itemmaster."barcode"',
        "itemmaster.status",
        "itemmaster.created",
      ],
      [['itemmaster."itemId"', "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Item list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getItemMasterById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const rows = await selectWithJoins(
      "itemmaster", [], { itemId: id, companyId, delete: 0 }, ["*"]
    );

    if (rows.length === 0) return requiredmessage(res, "Item not found");

    return successResponse(res, rows[0], "Item fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateItemMaster = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      itemId, itemCode, itemName, shortName, hsnCode, itemLocation,
      itemCategoryId, groupId, unit, taxSlab,
      thickness, length, width, weight,
      stockMapping, minQty, maxQty,
      // purchasePrice, actualPurchasePrice, salesPrice, mrp,
      barcodeType, barcode, status,
    } = req.body;

    const existing = await selectWithJoins(
      "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId", "barcode", "barcodeType"]
    );
    if (existing.length === 0) {
      return requiredmessage(res, "Item not found");
    }

    const codeExists = await selectWithJoins(
      "itemmaster", [], { itemCode: itemCode.trim(), companyId, delete: 0 }, ["itemId"]
    );
    const codeTakenByOther = codeExists.some((row) => String(row.itemId) !== String(itemId));
    if (codeTakenByOther) {
      return errorResponse(res, "Item code already exists. Please enter a different code.");
    }

    const categoryValid = await selectWithJoins(
      "itemcategory", [], { itemCategoryId, companyId, delete: 0 }, ["itemCategoryId"]
    );
    if (categoryValid.length === 0) {
      return errorResponse(res, "Selected item category is invalid.");
    }

    const groupValid = await selectWithJoins(
      "itemgroup", [], { itemGroupId: groupId, companyId, delete: 0 }, ["itemGroupId"]
    );
    if (groupValid.length === 0) {
      return errorResponse(res, "Selected group is invalid.");
    }

    let finalBarcode = "";
    if (barcodeType === "generate") {
      // Agar pehle se generate tha aur value already hai, to same rakho — dobara generate mat karo
      if (existing[0].barcodeType === "generate" && existing[0].barcode) {
        finalBarcode = existing[0].barcode;
      } else {
        let attempts = 0;
        do {
          finalBarcode = await generateBarcodeForCompany(companyId);
          const clash = await selectWithJoins(
            "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
          );
          const clashOther = clash.some((row) => String(row.itemId) !== String(itemId));
          if (!clashOther) break;
          attempts++;
        } while (attempts < 5);
      }
    } else {
      finalBarcode = (barcode || "").trim();
    }

    // barcode uniqueness — sirf tab check karo jab barcode non-empty ho
    if (finalBarcode) {
      const barcodeExists = await selectWithJoins(
        "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
      );
      const clashOther = barcodeExists.some((row) => String(row.itemId) !== String(itemId));
      if (clashOther) {
        return errorResponse(res, "This barcode is already in use. Please choose a different one.");
      }
    }

    await updateModelHelper(
      "itemmaster",
      {
        itemCode: itemCode.trim(),
        itemName: itemName.trim(),
        shortName: shortName.trim(),
        hsnCode: hsnCode.trim(),
        itemLocation: itemLocation || "",
        itemCategoryId,
        groupId,
        unit,
        taxSlab,
         thickness,
        length,
        width,
        weight,
        stockMapping: Boolean(stockMapping),
        minQty: stockMapping ? minQty : null,
        maxQty: stockMapping ? maxQty : null,
        // purchasePrice,
        // actualPurchasePrice,
        // salesPrice,
        // mrp,
        barcodeType,
        barcode: finalBarcode || null, // 👈 blank barcode ko NULL store karo
        status: status || "active",
        updated: new Date(),
      },
      { itemId, companyId }
    );

    return successResponse(res, {}, "Item updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This barcode or item code is already in use.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteItemMaster = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId } = req.body;

    const existing = await selectWithJoins(
      "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Item not found");

    await updateModelHelper(
      "itemmaster",
      { delete: 1, updated: new Date() },
      { itemId, companyId }
    );

    return successResponse(res, {}, "Item deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- SET MANUAL BARCODE (Barcode Manager se) ----------------
const setItemBarcode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId, barcode } = req.body;
    const trimmed = (barcode || "").trim();

    const existing = await selectWithJoins(
      "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Item not found");

    if (trimmed) {
      const clash = await selectWithJoins(
        "itemmaster", [], { barcode: trimmed, companyId, delete: 0 }, ["itemId"]
      );
      const clashOther = clash.some((row) => String(row.itemId) !== String(itemId));
      if (clashOther) {
        return errorResponse(res, "This barcode is already in use. Please choose a different one.");
      }
    }

    await updateModelHelper(
      "itemmaster",
      { barcode: trimmed || null, barcodeType: "manual", updated: new Date() },
      { itemId, companyId }
    );

    return successResponse(res, { barcode: trimmed }, "Barcode saved successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This barcode is already in use.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- AUTO GENERATE BARCODE for a single item ----------------
const autoGenerateItemBarcode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId } = req.body;

    const existing = await selectWithJoins(
      "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Item not found");

    let finalBarcode = "";
    let attempts = 0;
    do {
      finalBarcode = await generateBarcodeForCompany(companyId);
      const clash = await selectWithJoins(
        "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
      );
      if (clash.length === 0) break;
      attempts++;
    } while (attempts < 5);

    await updateModelHelper(
      "itemmaster",
      { barcode: finalBarcode, barcodeType: "generate", updated: new Date() },
      { itemId, companyId }
    );

    return successResponse(res, { barcode: finalBarcode }, "Barcode generated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- BULK AUTO GENERATE (selected rows) ----------------
const bulkAutoGenerateBarcode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemIds } = req.body; // array of numbers
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return errorResponse(res, "No items selected.");
    }

    const results = [];
    for (const itemId of itemIds) {
      const existing = await selectWithJoins(
        "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId"]
      );
      if (existing.length === 0) continue;

      let finalBarcode = "";
      let attempts = 0;
      do {
        finalBarcode = await generateBarcodeForCompany(companyId);
        const clash = await selectWithJoins(
          "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
        );
        if (clash.length === 0) break;
        attempts++;
      } while (attempts < 5);

      await updateModelHelper(
        "itemmaster",
        { barcode: finalBarcode, barcodeType: "generate", updated: new Date() },
        { itemId, companyId }
      );

      results.push({ itemId, barcode: finalBarcode });
    }

    return successResponse(res, results, "Barcodes generated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- VEHICLE ITEMS LIST (for Vehicle Purchase Bill drawer) ----------------
const getVehicleItemList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "itemmaster",
      [
        {
          table: "itemcategory",
          alias: "ic",
          onClause: { 'ic."itemCategoryId"': { "=": 'itemmaster."itemCategoryId"' } },
        },
        {
          table: "itemgroup",
          alias: "ig",
          onClause: { 'ig."itemGroupId"': { "=": 'itemmaster."groupId"' } },
        },
      ],
      {
        'itemmaster."companyId"': companyId,
        'itemmaster."delete"': 0,
      },
      [
        'itemmaster."itemId"',
        'itemmaster."itemCode"',
        'itemmaster."itemName"',
        'itemmaster."hsnCode"',
        'ic."categoryName" AS "categoryName"',
        'ig."groupName" AS "groupName"',
        'itemmaster."unit"',
        'itemmaster."taxSlab"',
        'itemmaster."salesPrice"',
        'itemmaster."barcode"',
      ],
      [['itemmaster."itemId"', "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Vehicle item list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- ITEM LOOKUP BY BARCODE (for scan input) ----------------
const getItemByBarcode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { barcode } = req.params;
    if (!barcode) return errorResponse(res, "Barcode is required.");

    const rows = await selectWithJoinsV2(
      "itemmaster",
      [
        {
          table: "itemcategory",
          alias: "ic",
          onClause: { 'ic."itemCategoryId"': { "=": 'itemmaster."itemCategoryId"' } },
        },
        {
          table: "itemgroup",
          alias: "ig",
          onClause: { 'ig."itemGroupId"': { "=": 'itemmaster."groupId"' } },
        },
      ],
      {
        'itemmaster."companyId"': companyId,
        'itemmaster."barcode"': barcode.trim(),
        'itemmaster."delete"': 0,
      },
      [
        'itemmaster."itemId"',
        'itemmaster."itemCode"',
        'itemmaster."itemName"',
        'itemmaster."hsnCode"',
        'ic."categoryName" AS "categoryName"',
        'ig."groupName" AS "groupName"',
        'itemmaster."unit"',
        'itemmaster."taxSlab"',
        'itemmaster."salesPrice"',
        'itemmaster."barcode"',
      ],
      [],
      1,
      0
    );

    if (rows.length === 0) {
      return errorResponse(res, "No item found for this barcode.");
    }

    return successResponse(res, rows[0], "Item found successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getPurchaseItemList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "itemmaster", [],
      { 'itemmaster."companyId"': companyId, 'itemmaster."delete"': 0 },
      [
        'itemmaster."itemId"', 'itemmaster."itemCode"', 'itemmaster."itemName"',
        'itemmaster."hsnCode"', 'itemmaster."unit"', 'itemmaster."taxSlab"',
        'itemmaster."purchasePrice"',
      ],
      [['itemmaster."itemId"', "DESC"]], 0, 0
    );

    return successResponse(res, list, "Item list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};



// ---------------- BULK IMPORT (from Excel) — validate ALL rows first, reject whole file if any error ----------------
const bulkImportItemMaster = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { items } = req.body; // already shape-validated by Joi

    // ============================================================
    // GET CATEGORIES
    // ============================================================
    const categories = await selectWithJoins(
      "itemcategory",
      [],
      { companyId, delete: 0 },
      ["itemCategoryId", "categoryName"]
    );

    // ============================================================
    // GET GROUPS
    // ============================================================
    const groups = await selectWithJoins(
      "itemgroup",
      [],
      { companyId, delete: 0 },
      ["itemGroupId", "groupName"]
    );

    const categoryMap = new Map(
      categories.map((c) => [
        c.categoryName.trim().toLowerCase(),
        c.itemCategoryId,
      ])
    );

    const groupMap = new Map(
      groups.map((g) => [
        g.groupName.trim().toLowerCase(),
        g.itemGroupId,
      ])
    );

    // ============================================================
    // GET EXISTING ITEMS
    // IMPORTANT:
    // We get BOTH active and soft-deleted records.
    // ============================================================
    const existingItems = await selectWithJoins(
      "itemmaster",
      [],
      { companyId },
      ["itemId", "itemCode", "barcode", "delete"]
    );

    // ============================================================
    // ACTIVE ITEM CODES
    // delete = 0
    // These should be rejected as duplicate.
    // ============================================================
    const activeCodes = new Set(
      existingItems
        .filter((i) => Number(i.delete) === 0)
        .map((i) => (i.itemCode || "").trim().toLowerCase())
    );

    // ============================================================
    // SOFT-DELETED ITEMS
    // delete = 1
    //
    // If imported itemCode matches one of these,
    // we will RESTORE the existing record instead of INSERTING.
    // ============================================================
    const deletedItemsByCode = new Map(
      existingItems
        .filter((i) => Number(i.delete) === 1)
        .map((i) => [
          (i.itemCode || "").trim().toLowerCase(),
          i,
        ])
    );

    // ============================================================
    // ACTIVE BARCODES
    // ============================================================
    const activeBarcodes = new Set(
      existingItems
        .filter((i) => Number(i.delete) === 0 && i.barcode)
        .map((i) => i.barcode.trim().toLowerCase())
    );

    // ============================================================
    // PASS 1
    // Validate every row first.
    // Nothing is saved yet.
    // ============================================================
    const errors = [];
    const seenCodes = new Set();
    const seenBarcodes = new Set();
    const normalizedRows = [];

    items.forEach((row, i) => {
      const rowNum = i + 2;

      const itemCode = row.itemCode.trim();
      const categoryName = row.categoryName.trim();
      const groupName = row.groupName.trim();
      const barcode = (row.barcode || "").toString().trim();

      // ==========================================================
      // CATEGORY CHECK
      // ==========================================================
      const itemCategoryId = categoryMap.get(
        categoryName.toLowerCase()
      );

      if (!itemCategoryId) {
        errors.push({
          row: rowNum,
          itemCode,
          reason: `Item Category "${categoryName}" not found`,
        });
        return;
      }

      // ==========================================================
      // GROUP CHECK
      // ==========================================================
      const groupId = groupMap.get(
        groupName.toLowerCase()
      );

      if (!groupId) {
        errors.push({
          row: rowNum,
          itemCode,
          reason: `Group "${groupName}" not found`,
        });
        return;
      }

      // ==========================================================
      // ITEM CODE CHECK
      // ==========================================================
      const codeKey = itemCode.toLowerCase();

      // Active record already exists
      if (activeCodes.has(codeKey)) {
        errors.push({
          row: rowNum,
          itemCode,
          reason: "Item code already exists in database",
        });
        return;
      }

      // Duplicate inside uploaded Excel/file
      if (seenCodes.has(codeKey)) {
        errors.push({
          row: rowNum,
          itemCode,
          reason: "Duplicate item code within the imported file",
        });
        return;
      }

      // ==========================================================
      // BARCODE CHECK
      // ==========================================================
      const barcodeKey = barcode
        ? barcode.toLowerCase()
        : null;

      // Active barcode already exists
      if (barcodeKey && activeBarcodes.has(barcodeKey)) {
        errors.push({
          row: rowNum,
          itemCode,
          reason: "Barcode already exists in database",
        });
        return;
      }

      // Duplicate barcode inside uploaded file
      if (barcodeKey && seenBarcodes.has(barcodeKey)) {
        errors.push({
          row: rowNum,
          itemCode,
          reason: "Duplicate barcode within the imported file",
        });
        return;
      }

      // ==========================================================
      // Mark code/barcode as seen
      // ==========================================================
      seenCodes.add(codeKey);

      if (barcodeKey) {
        seenBarcodes.add(barcodeKey);
      }

      // ==========================================================
      // NORMALIZE ROW
      // ==========================================================
      normalizedRows.push({
        rowNum,
        itemCode,
        itemName: row.itemName.trim(),
        shortName: (row.shortName || row.itemName).trim(),
        hsnCode: (row.hsnCode || "").trim(),
        itemCategoryId,
        groupId,
        unit: (row.unit || "").trim(),
        taxSlab: (row.taxSlab || "").trim(),
        purchasePrice: Number(row.purchasePrice) || 0,
        actualPurchasePrice: Number(row.actualPurchasePrice) || 0,
        salesPrice: Number(row.salesPrice) || 0,
        mrp: Number(row.mrp) || 0,
        barcode: barcode || null,
      });
    });

    // ============================================================
    // REJECT WHOLE FILE IF ANY ROW HAS ERROR
    // ============================================================
    if (errors.length > 0) {
      return errorResponse(
        res,
        `Import rejected: ${errors.length} row(s) have errors.`,
        errors
      );
    }

    // ============================================================
    // PASS 2
    // Everything is valid.
    //
    // If soft-deleted item exists:
    //     UPDATE + RESTORE it
    //
    // Otherwise:
    //     CREATE new item
    // ============================================================
    const created = [];

    for (const row of normalizedRows) {
      const codeKey = row.itemCode.toLowerCase();

      // Check whether this code belongs to a soft-deleted item
      const deletedItem = deletedItemsByCode.get(codeKey);

      let savedItem;

      // ==========================================================
      // CASE 1: SOFT-DELETED ITEM EXISTS
      // RESTORE EXISTING RECORD
      // ==========================================================
          if (deletedItem) {
        await updateModelHelper(
          "itemmaster",
          {
            itemName: row.itemName,
            shortName: row.shortName,
            hsnCode: row.hsnCode,
            itemLocation: "",
            itemCategoryId: row.itemCategoryId,
            groupId: row.groupId,
            unit: row.unit,
            taxSlab: row.taxSlab,
            stockMapping: false,
            minQty: null,
            maxQty: null,
            purchasePrice: row.purchasePrice,
            actualPurchasePrice: row.actualPurchasePrice,
            salesPrice: row.salesPrice,
            mrp: row.mrp,
            barcodeType: "manual",
            barcode: row.barcode,
            status: "active",

            // RESTORE
            delete: 0,
          },
          {
            itemId: deletedItem.itemId,
            companyId,
          }
        );

        savedItem = {
          itemId: deletedItem.itemId,
        };
      }

      // ==========================================================
      // CASE 2: NO SOFT-DELETED ITEM
      // CREATE NEW RECORD
      // ==========================================================
      else {
        savedItem = await saveModel("itemmaster", {
          companyId,
          itemCode: row.itemCode,
          itemName: row.itemName,
          shortName: row.shortName,
          hsnCode: row.hsnCode,
          itemLocation: "",
          itemCategoryId: row.itemCategoryId,
          groupId: row.groupId,
          unit: row.unit,
          taxSlab: row.taxSlab,
          stockMapping: false,
          minQty: null,
          maxQty: null,
          purchasePrice: row.purchasePrice,
          actualPurchasePrice: row.actualPurchasePrice,
          salesPrice: row.salesPrice,
          mrp: row.mrp,
          barcodeType: "manual",
          barcode: row.barcode,
          status: "active",
          delete: 0,
        });
      }

      // ==========================================================
      // SUCCESS RESULT
      // ==========================================================
      created.push({
        row: row.rowNum,
        itemId: savedItem.itemId,
        itemCode: row.itemCode,
      });
    }

    // ============================================================
    // FINAL SUCCESS
    // ============================================================
    return successResponse(
      res,
      { created },
      `${created.length} item(s) imported successfully.`
    );
  } catch (error) {
    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
  }
};



const getFinishedGoodsItemList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return errorResponse(res, "Company not found.", 401);
    }

    // First find Finished Goods category
    const categoryRows = await selectWithJoins(
      "itemcategory",
      [],
      {
        companyId,
        categoryName: "Finished Goods",
        delete: 0,
      },
      [
        "itemCategoryId",
        "categoryName",
      ]
    );

    if (!categoryRows || categoryRows.length === 0) {
      return successResponse(
        res,
        [],
        "Finished Goods category not found."
      );
    }

    const itemCategoryId = categoryRows[0].itemCategoryId;

    // Get Finished Goods items
    const items = await selectWithJoins(
      "itemmaster",
      [],
      {
        companyId,
        itemCategoryId,
        delete: 0,
      },
      [
        "itemId",
        "itemCode",
        "itemName",
        "shortName",
        "unit",
        "status",
      ]
    );

    return successResponse(
      res,
      items || [],
      "Finished Goods items fetched successfully."
    );

  } catch (error) {
    console.error("getFinishedGoodsItemList error:", error);

    return errorResponse(
      res,
      error.message || "Failed to fetch Finished Goods items.",
      500
    );
  }
};

module.exports = {
  getNextBarcode,
  createItemMaster,
  getItemMasterList,
  getItemMasterById,
  updateItemMaster,
  deleteItemMaster,
  setItemBarcode,
  autoGenerateItemBarcode,
  bulkAutoGenerateBarcode,
  getVehicleItemList,
  getItemByBarcode,
  getPurchaseItemList,
  bulkImportItemMaster,
    getFinishedGoodsItemList,
};