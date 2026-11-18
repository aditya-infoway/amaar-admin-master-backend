const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
  selectWithJoinsV2,
} = require("../../../helper/index.js");

const db = require("../../../modelses");
const Bom = db.bom;

const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());
const isYes = (v) => ["yes", "y", "true", "1"].includes(clean(v).toLowerCase());

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
// ---------------- Barcode company me already kisi aur item pe hai ya nahi ----------------
// excludeItemId: update/generate me apna item ignore karne ke liye
const isBarcodeTaken = async (companyId, barcode, excludeItemId = null) => {
  const value = String(barcode || "").trim();
  if (!value) return false;

  const rows = await selectWithJoins(
    "itemmaster",
    [],
    { companyId, barcode: value },
    ["itemId"]
  );

  return rows.some((row) => String(row.itemId) !== String(excludeItemId));
};
// ---------------- Item code: category ke hisaab se next code ----------------
// Category me jo serialNo hai wo start number hai. Us category ke items
// (deleted bhi) me se sabse bada number dhoondh kar +1 karte hain.
const generateNextItemCode = async (companyId, category) => {
  const prefix = category.prefix || "";
  const suffix = category.suffix || "";
  const head = `${prefix}${suffix}`;
  const startStr = String(category.serialNo || "");
  const width = startStr.length || 1;
  const start = parseInt(startStr, 10) || 1;

  // delete filter nahi lagaya, kyunki unique index me deleted rows bhi count hoti hain
  const rows = await selectWithJoins(
    "itemmaster",
    [],
    { companyId, itemCategoryId: category.itemCategoryId },
    ["itemCode"]
  );

  let maxNum = null;
  rows.forEach((row) => {
    const code = String(row.itemCode || "");
    if (!code.startsWith(head)) return;
    const rest = code.slice(head.length);
    if (!/^\d+$/.test(rest)) return;
    const num = parseInt(rest, 10);
    if (maxNum === null || num > maxNum) maxNum = num;
  });

  let next = maxNum === null ? start : Math.max(start, maxNum + 1);

  // Dusri category ya manual code se clash ho to aage badho
  for (let i = 0; i < 50; i++) {
    const candidate = `${head}${String(next).padStart(width, "0")}`;
    const clash = await selectWithJoins(
      "itemmaster",
      [],
      { companyId, itemCode: candidate },
      ["itemId"]
    );
    if (clash.length === 0) return candidate;
    next++;
  }
  throw new Error("Could not generate a unique item code");
};

// ---------------- GET NEXT ITEM CODE (category select hone par) ----------------
const getNextItemCode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { categoryId } = req.params;

    const rows = await selectWithJoins(
      "itemcategory",
      [],
      { itemCategoryId: categoryId, companyId, delete: 0 },
      ["itemCategoryId", "itemCodeType", "prefix", "suffix", "serialNo"]
    );
    if (rows.length === 0) {
      return errorResponse(res, "Selected item category is invalid.");
    }

    const category = rows[0].toJSON ? rows[0].toJSON() : rows[0];

    if (category.itemCodeType !== "auto") {
      return successResponse(res, { itemCodeType: "manual", itemCode: "" }, "Manual item code");
    }

    const itemCode = await generateNextItemCode(companyId, category);
    return successResponse(res, { itemCodeType: "auto", itemCode }, "Next item code generated");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};
// ---------------- CREATE ----------------
// ---------------- CREATE ----------------
// const createItemMaster = async (req, res) => {
//   try {
//     const companyId = req.companyId;
//     if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

//     const {
//       itemCode, itemName, shortName, hsnCode, itemLocation,
//       itemCategoryId, groupId, unit, taxSlab,
//       openingStock, stockValue,
//       thickness, length, width, weight,
//       stockMapping, minQty, maxQty,
//       // purchasePrice, actualPurchasePrice, salesPrice, mrp,
//       barcodeType, barcode, status,
//       createdBy, createdType,
//     } = req.body;

//     // itemCategory company ka hi ho (code settings bhi yahin se lete hain)
//     const categoryRows = await selectWithJoins(
//       "itemcategory",
//       [],
//       { itemCategoryId, companyId, delete: 0 },
//       ["itemCategoryId", "itemCodeType", "prefix", "suffix", "serialNo"]
//     );
//     if (categoryRows.length === 0) {
//       return errorResponse(res, "Selected item category is invalid.");
//     }
//     const category = categoryRows[0].toJSON ? categoryRows[0].toJSON() : categoryRows[0];

//     // Auto category: code server banayega (frontend ka bheja code ignore).
//     // Manual category: user ka code.
//     let finalItemCode = itemCode.trim();
//     if (category.itemCodeType === "auto") {
//       finalItemCode = await generateNextItemCode(companyId, category);
//     }

//     // itemCode company-wise unique
//     const codeExists = await selectWithJoins(
//       "itemmaster", [], { itemCode: finalItemCode, companyId, delete: 0 }, ["itemId"]
//     );
//     if (codeExists.length > 0) {
//       return errorResponse(res, "Item code already exists. Please enter a different code.");
//     }

//     // group company ka hi ho
//     const groupValid = await selectWithJoins(
//       "itemgroup", [], { itemGroupId: groupId, companyId, delete: 0 }, ["itemGroupId"]
//     );
//     if (groupValid.length === 0) {
//       return errorResponse(res, "Selected group is invalid.");
//     }

//     // ---- Barcode resolve karo — manual value ya server-generated ----
//     let finalBarcode = "";
//     if (barcodeType === "generate") {
//       let attempts = 0;
//       do {
//         finalBarcode = await generateBarcodeForCompany(companyId);
//         const clash = await selectWithJoins(
//           "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
//         );
//         if (clash.length === 0) break;
//         attempts++;
//       } while (attempts < 5);
//     } else {
//       finalBarcode = (barcode || "").trim();
//     }

//     if (finalBarcode) {
//       const barcodeExists = await selectWithJoins(
//         "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
//       );
//       if (barcodeExists.length > 0) {
//         return errorResponse(res, "This barcode is already in use. Please choose a different one.");
//       }
//     }

//     const payload = {
//       companyId,
//       itemCode: finalItemCode,
//       itemName: itemName.trim(),
//       shortName: shortName.trim(),
//       hsnCode: hsnCode.trim(),
//       itemLocation: itemLocation || "",
//       itemCategoryId,
//       groupId,
//       unit,
//       taxSlab,
//       openingStock,
//       stockValue,
//       thickness,
//       length,
//       width,
//       weight,
//       stockMapping: Boolean(stockMapping),
//       minQty: stockMapping ? minQty : null,
//       maxQty: stockMapping ? maxQty : null,
//       // purchasePrice,
//       // actualPurchasePrice,
//       // salesPrice,
//       // mrp,
//       barcodeType,
//       barcode: finalBarcode || null,
//       status: status || "active",
//       createdBy,
//       createdType,
//       delete: 0,
//     };

//     const item = await saveModel("itemmaster", payload);

//     return successResponse(res, item, "Item created successfully");
//   } catch (error) {
//     if (error?.name === "SequelizeUniqueConstraintError") {
//       return errorResponse(res, "This barcode or item code is already in use.");
//     }
//     return errorResponse(res, "Something Went Wrong", error);
//   }
// };
// ---------------- CREATE ----------------
// ---------------- CREATE ----------------
const createItemMaster = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      itemCode, itemName, shortName, hsnCode, itemLocation,
      itemCategoryId, groupId, subGroupId, unit, taxSlab, // 👈 subGroupId add
      openingStock, stockValue,
      thickness, length, width, weight,
      stockMapping, minQty, maxQty,
      // purchasePrice, actualPurchasePrice, salesPrice, mrp,
      status,
      createdBy, createdType,
    } = req.body;

    // itemCategory company ka hi ho (code settings bhi yahin se lete hain)
    const categoryRows = await selectWithJoins(
      "itemcategory",
      [],
      { itemCategoryId, companyId, delete: 0 },
      ["itemCategoryId", "itemCodeType", "prefix", "suffix", "serialNo"]
    );
    if (categoryRows.length === 0) {
      return errorResponse(res, "Selected item category is invalid.");
    }
    const category = categoryRows[0].toJSON ? categoryRows[0].toJSON() : categoryRows[0];

    // Auto category: code server banayega (frontend ka bheja code ignore).
    // Manual category: user ka code.
    let finalItemCode = itemCode.trim();
    if (category.itemCodeType === "auto") {
      finalItemCode = await generateNextItemCode(companyId, category);
    }

    // itemCode company-wise unique
    const codeExists = await selectWithJoins(
      "itemmaster", [], { itemCode: finalItemCode, companyId, delete: 0 }, ["itemId"]
    );
    if (codeExists.length > 0) {
      return errorResponse(res, "Item code already exists. Please enter a different code.");
    }

    // group company ka hi ho
    const groupValid = await selectWithJoins(
      "itemgroup", [], { itemGroupId: groupId, companyId, delete: 0 }, ["itemGroupId"]
    );
    if (groupValid.length === 0) {
      return errorResponse(res, "Selected group is invalid.");
    }

    // 👇 sub group (agar select kiya ho) company ka ho aur isi group ke under ho
    if (subGroupId) {
      const subValid = await selectWithJoins(
        "subgroup", [], { subGroupId, groupId, companyId, delete: 0 }, ["subGroupId"]
      );
      if (subValid.length === 0) {
        return errorResponse(res, "Selected sub group is invalid.");
      }
    }

    // ---- Barcode = Item Code ----
    const finalBarcode = finalItemCode;
    if (await isBarcodeTaken(companyId, finalBarcode)) {
      return errorResponse(
        res,
        `Barcode "${finalBarcode}" is already used by another item. Please use a different item code.`
      );
    }

    const payload = {
      companyId,
      itemCode: finalItemCode,
      itemName: itemName.trim(),
      shortName: shortName.trim(),
      hsnCode: hsnCode.trim(),
      itemLocation: itemLocation || "",
      itemCategoryId,
      groupId,
      subGroupId: subGroupId || null, // 👈 add
      unit,
      taxSlab,
      openingStock,
      stockValue,
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
      barcodeType: "generate",
      barcode: finalBarcode,
      status: status || "active",
      createdBy,
      createdType,
      delete: 0,
    };

    const item = await saveModel("itemmaster", payload);

    return successResponse(res, item, "Item created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Item code is already in use.");
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
        'itemmaster."itemLocation"',
        'ic."categoryName" AS "categoryName"',
        'ig."groupName" AS "groupName"',
        'itemmaster."subGroupId"',
        'itemmaster."unit"',
        'itemmaster."taxSlab"',
        'itemmaster."openingStock"',
        'itemmaster."stockValue"',
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
        'itemmaster."createdBy"',
        'itemmaster."createdType"',
        "itemmaster.status",
        "itemmaster.created",
      ],
      [['itemmaster."itemId"', "DESC"]],
      0,
      0
    );
    // sub group ka naam (join ki jagah alag map, taaki bina sub group wale items na jaayein)
    const subGroupRows = await selectWithJoins(
      "subgroup",
      [],
      { companyId, delete: 0 },
      ["subGroupId", "subGroupName"]
    );
    const subGroupMap = (subGroupRows || []).reduce((acc, s) => {
      acc[String(s.subGroupId)] = s.subGroupName;
      return acc;
    }, {});
    // createdBy me companyId ya employeeId store hota hai — name resolve karo
    const createdByIds = [
      ...new Set((list || []).map((row) => row.createdBy).filter(Boolean)),
    ];

    let companyMap = {};
    if (createdByIds.length > 0) {
      const companies = await selectWithJoins(
        "company",
        [],
        { companyId: createdByIds, delete: 0 },
        ["companyId", "companyName"]
      );
      companyMap = (companies || []).reduce((acc, item) => {
        acc[String(item.companyId)] = item.companyName;
        return acc;
      }, {});
    }

    let employeeMap = {};
    if (createdByIds.length > 0) {
      const employees = await selectWithJoins(
        "employee",
        [],
        { employeeId: createdByIds, delete: 0 },
        ["employeeId", "employeeName"]
      );
      employeeMap = (employees || []).reduce((acc, item) => {
        acc[String(item.employeeId)] = item.employeeName;
        return acc;
      }, {});
    }

    const data = (list || []).map((row) => {
      const subGroupName = subGroupMap[String(row.subGroupId)] || "";

      return {
        ...row,

        // Sub Group selected hai to uska naam show hoga,
        // otherwise main Group ka naam.
        groupName: subGroupName || row.groupName,

        subGroupName,

        createdBy:
          companyMap[String(row.createdBy)] ||
          employeeMap[String(row.createdBy)] ||
          row.createdBy,
      };
    });
    return successResponse(res, data, "Item list fetched successfully");
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

    const itemRow = rows[0].toJSON ? rows[0].toJSON() : rows[0];

    // createdBy resolve — company ho ya employee
    if (itemRow.createdBy) {
      const companyRows = await selectWithJoins(
        "company",
        [],
        { companyId: itemRow.createdBy, delete: 0 },
        ["companyId", "companyName"]
      );
      if (companyRows.length > 0) {
        itemRow.createdBy = companyRows[0].companyName;
      } else {
        const employeeRows = await selectWithJoins(
          "employee",
          [],
          { employeeId: itemRow.createdBy, delete: 0 },
          ["employeeId", "employeeName"]
        );
        if (employeeRows.length > 0) {
          itemRow.createdBy = employeeRows[0].employeeName;
        }
      }
    }

    return successResponse(res, itemRow, "Item fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
// const updateItemMaster = async (req, res) => {
//   try {
//     const companyId = req.companyId;
//     if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

//     const {
//       itemId, itemCode, itemName, shortName, hsnCode, itemLocation,
//       itemCategoryId, groupId, unit, taxSlab,
//       openingStock, stockValue,
//       thickness, length, width, weight,
//       stockMapping, minQty, maxQty,
//       // purchasePrice, actualPurchasePrice, salesPrice, mrp,
//       barcodeType, barcode, status,
//     } = req.body;

//     const existing = await selectWithJoins(
//       "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId", "barcode", "barcodeType"]
//     );
//     if (existing.length === 0) {
//       return requiredmessage(res, "Item not found");
//     }

//     const codeExists = await selectWithJoins(
//       "itemmaster", [], { itemCode: itemCode.trim(), companyId, delete: 0 }, ["itemId"]
//     );
//     const codeTakenByOther = codeExists.some((row) => String(row.itemId) !== String(itemId));
//     if (codeTakenByOther) {
//       return errorResponse(res, "Item code already exists. Please enter a different code.");
//     }

//     const categoryValid = await selectWithJoins(
//       "itemcategory", [], { itemCategoryId, companyId, delete: 0 }, ["itemCategoryId"]
//     );
//     if (categoryValid.length === 0) {
//       return errorResponse(res, "Selected item category is invalid.");
//     }

//     const groupValid = await selectWithJoins(
//       "itemgroup", [], { itemGroupId: groupId, companyId, delete: 0 }, ["itemGroupId"]
//     );
//     if (groupValid.length === 0) {
//       return errorResponse(res, "Selected group is invalid.");
//     }

//     let finalBarcode = "";
//     if (barcodeType === "generate") {
//       // Agar pehle se generate tha aur value already hai, to same rakho — dobara generate mat karo
//       if (existing[0].barcodeType === "generate" && existing[0].barcode) {
//         finalBarcode = existing[0].barcode;
//       } else {
//         let attempts = 0;
//         do {
//           finalBarcode = await generateBarcodeForCompany(companyId);
//           const clash = await selectWithJoins(
//             "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
//           );
//           const clashOther = clash.some((row) => String(row.itemId) !== String(itemId));
//           if (!clashOther) break;
//           attempts++;
//         } while (attempts < 5);
//       }
//     } else {
//       finalBarcode = (barcode || "").trim();
//     }

//     // barcode uniqueness — sirf tab check karo jab barcode non-empty ho
//     if (finalBarcode) {
//       const barcodeExists = await selectWithJoins(
//         "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
//       );
//       const clashOther = barcodeExists.some((row) => String(row.itemId) !== String(itemId));
//       if (clashOther) {
//         return errorResponse(res, "This barcode is already in use. Please choose a different one.");
//       }
//     }

//     await updateModelHelper(
//       "itemmaster",
//       {
//         itemCode: itemCode.trim(),
//         itemName: itemName.trim(),
//         shortName: shortName.trim(),
//         hsnCode: hsnCode.trim(),
//         itemLocation: itemLocation || "",
//         itemCategoryId,
//         groupId,
//         unit,
//         taxSlab,
//         openingStock,
//         stockValue,
//         thickness,
//         length,
//         width,
//         weight,
//         stockMapping: Boolean(stockMapping),
//         minQty: stockMapping ? minQty : null,
//         maxQty: stockMapping ? maxQty : null,
//         // purchasePrice,
//         // actualPurchasePrice,
//         // salesPrice,
//         // mrp,
//         barcodeType,
//         barcode: finalBarcode || null, // 👈 blank barcode ko NULL store karo
//         status: status || "active",
//         updated: new Date(),
//       },
//       { itemId, companyId }
//     );

//     return successResponse(res, {}, "Item updated successfully");
//   } catch (error) {
//     if (error?.name === "SequelizeUniqueConstraintError") {
//       return errorResponse(res, "This barcode or item code is already in use.");
//     }
//     return errorResponse(res, "Something Went Wrong", error);
//   }
// };
// ---------------- UPDATE ----------------
const updateItemMaster = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      itemId, itemCode, itemName, shortName, hsnCode, itemLocation,
      itemCategoryId, groupId, subGroupId, unit, taxSlab,
      openingStock, stockValue,
      thickness, length, width, weight,
      stockMapping, minQty, maxQty,
      // purchasePrice, actualPurchasePrice, salesPrice, mrp,
      // barcodeType, barcode,   // 👈 barcode temporarily disabled
      status,
    } = req.body;

    const existing = await selectWithJoins(
      "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId"]
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

    // ---- Barcode (temporarily disabled) ----
    // let finalBarcode = "";
    // if (barcodeType === "generate") {
    //   if (existing[0].barcodeType === "generate" && existing[0].barcode) {
    //     finalBarcode = existing[0].barcode;
    //   } else {
    //     let attempts = 0;
    //     do {
    //       finalBarcode = await generateBarcodeForCompany(companyId);
    //       const clash = await selectWithJoins(
    //         "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
    //       );
    //       const clashOther = clash.some((row) => String(row.itemId) !== String(itemId));
    //       if (!clashOther) break;
    //       attempts++;
    //     } while (attempts < 5);
    //   }
    // } else {
    //   finalBarcode = (barcode || "").trim();
    // }
    //
    // if (finalBarcode) {
    //   const barcodeExists = await selectWithJoins(
    //     "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
    //   );
    //   const clashOther = barcodeExists.some((row) => String(row.itemId) !== String(itemId));
    //   if (clashOther) {
    //     return errorResponse(res, "This barcode is already in use. Please choose a different one.");
    //   }
    // }

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
        subGroupId,
        unit,
        taxSlab,
        openingStock,
        stockValue,
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
        // barcodeType,                       // 👈 comment: purana barcode safe rahega
        // barcode: finalBarcode || null,
        status: status || "active",
        updated: new Date(),
      },
      { itemId, companyId }
    );

    return successResponse(res, {}, "Item updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Item code is already in use.");
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
// const autoGenerateItemBarcode = async (req, res) => {
//   try {
//     const companyId = req.companyId;
//     if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

//     const { itemId } = req.body;

//     const existing = await selectWithJoins(
//       "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId"]
//     );
//     if (existing.length === 0) return requiredmessage(res, "Item not found");

//     let finalBarcode = "";
//     let attempts = 0;
//     do {
//       finalBarcode = await generateBarcodeForCompany(companyId);
//       const clash = await selectWithJoins(
//         "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
//       );
//       if (clash.length === 0) break;
//       attempts++;
//     } while (attempts < 5);

//     await updateModelHelper(
//       "itemmaster",
//       { barcode: finalBarcode, barcodeType: "generate", updated: new Date() },
//       { itemId, companyId }
//     );

//     return successResponse(res, { barcode: finalBarcode }, "Barcode generated successfully");
//   } catch (error) {
//     return errorResponse(res, "Something Went Wrong", error);
//   }
// };

// ---------------- BULK AUTO GENERATE (selected rows) ----------------
// const bulkAutoGenerateBarcode = async (req, res) => {
//   try {
//     const companyId = req.companyId;
//     if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

//     const { itemIds } = req.body; // array of numbers
//     if (!Array.isArray(itemIds) || itemIds.length === 0) {
//       return errorResponse(res, "No items selected.");
//     }

//     const results = [];
//     for (const itemId of itemIds) {
//       const existing = await selectWithJoins(
//         "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId"]
//       );
//       if (existing.length === 0) continue;

//       let finalBarcode = "";
//       let attempts = 0;
//       do {
//         finalBarcode = await generateBarcodeForCompany(companyId);
//         const clash = await selectWithJoins(
//           "itemmaster", [], { barcode: finalBarcode, companyId, delete: 0 }, ["itemId"]
//         );
//         if (clash.length === 0) break;
//         attempts++;
//       } while (attempts < 5);

//       await updateModelHelper(
//         "itemmaster",
//         { barcode: finalBarcode, barcodeType: "generate", updated: new Date() },
//         { itemId, companyId }
//       );

//       results.push({ itemId, barcode: finalBarcode });
//     }

//     return successResponse(res, results, "Barcodes generated successfully");
//   } catch (error) {
//     return errorResponse(res, "Something Went Wrong", error);
//   }
// };

// ---------------- AUTO GENERATE BARCODE for a single item (barcode = item code) ----------------
const autoGenerateItemBarcode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId } = req.body;

    const existing = await selectWithJoins(
      "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId", "itemCode"]
    );
    if (existing.length === 0) return requiredmessage(res, "Item not found");

    const finalBarcode = String(existing[0].itemCode || "").trim();
    if (!finalBarcode) return errorResponse(res, "Item code is missing for this item.");

    if (await isBarcodeTaken(companyId, finalBarcode, itemId)) {
      return errorResponse(
        res,
        `Barcode "${finalBarcode}" is already used by another item.`
      );
    }

    await updateModelHelper(
      "itemmaster",
      { barcode: finalBarcode, barcodeType: "generate", updated: new Date() },
      { itemId, companyId }
    );

    return successResponse(res, { barcode: finalBarcode }, "Barcode generated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This barcode is already in use.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- BULK AUTO GENERATE (selected rows, barcode = item code) ----------------
const bulkAutoGenerateBarcode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemIds } = req.body; // array of numbers
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return errorResponse(res, "No items selected.");
    }

    const results = [];
    const skipped = [];

    for (const itemId of itemIds) {
      const existing = await selectWithJoins(
        "itemmaster", [], { itemId, companyId, delete: 0 }, ["itemId", "itemCode"]
      );
      if (existing.length === 0) continue;

      const finalBarcode = String(existing[0].itemCode || "").trim();
      if (!finalBarcode) {
        skipped.push({ itemId, reason: "Item code is missing" });
        continue;
      }

      if (await isBarcodeTaken(companyId, finalBarcode, itemId)) {
        skipped.push({ itemId, reason: `Barcode "${finalBarcode}" already used by another item` });
        continue;
      }

      await updateModelHelper(
        "itemmaster",
        { barcode: finalBarcode, barcodeType: "generate", updated: new Date() },
        { itemId, companyId }
      );

      results.push({ itemId, barcode: finalBarcode });
    }

    if (results.length === 0 && skipped.length > 0) {
      return errorResponse(res, `No barcode generated. ${skipped[0].reason}.`);
    }

    return successResponse(
      res,
      { generated: results, skipped },
      skipped.length > 0
        ? `${results.length} barcode(s) generated, ${skipped.length} skipped.`
        : "Barcodes generated successfully"
    );
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
        // 'itemmaster."salesPrice"',
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
        // 'itemmaster."salesPrice"',
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
        // 'itemmaster."purchasePrice"',
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
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { items, createdBy, createdType } = req.body;

    const categories = await selectWithJoins(
      "itemcategory", [], { companyId, delete: 0 }, ["itemCategoryId", "categoryName"]
    );
    const groups = await selectWithJoins(
      "itemgroup", [], { companyId, delete: 0 }, ["itemGroupId", "groupName"]
    );
    const categoryMap = new Map(categories.map((c) => [c.categoryName.trim().toLowerCase(), c.itemCategoryId]));
    const groupMap = new Map(groups.map((g) => [g.groupName.trim().toLowerCase(), g.itemGroupId]));

    // active + soft-deleted items
    const existingItems = await selectWithJoins(
      "itemmaster", [], { companyId }, ["itemId", "itemCode", "barcode", "delete"]
    );
    const activeCodes = new Set(
      existingItems.filter((i) => Number(i.delete) === 0).map((i) => (i.itemCode || "").trim().toLowerCase())
    );
    const deletedItemsByCode = new Map(
      existingItems.filter((i) => Number(i.delete) === 1).map((i) => [(i.itemCode || "").trim().toLowerCase(), i])
    );
    const activeBarcodes = new Set(
      existingItems.filter((i) => Number(i.delete) === 0 && i.barcode).map((i) => i.barcode.trim().toLowerCase())
    );

    // ---------------- PASS 1: validate every row, save nothing ----------------
    const errors = [];
    const seenCodes = new Set();
    const seenBarcodes = new Set();
    const normalizedRows = [];

    items.forEach((row, i) => {
      const rowNum = i + 2;
      const fail = (reason) => errors.push({ row: rowNum, itemCode: clean(row.itemCode), reason });

      const itemCode = clean(row.itemCode);
      const itemName = clean(row.itemName);
      const categoryName = clean(row.categoryName);
      const groupName = clean(row.groupName);

      if (!itemCode) return fail("Item Code is required");
      if (!itemName) return fail("Item Name is required");
      if (!categoryName) return fail("Item Category is required");
      if (!groupName) return fail("Group is required");

      const itemCategoryId = categoryMap.get(categoryName.toLowerCase());
      if (!itemCategoryId) return fail(`Item Category "${categoryName}" not found`);

      const groupId = groupMap.get(groupName.toLowerCase());
      if (!groupId) return fail(`Group "${groupName}" not found`);

      const stockMapping = isYes(row.stockMapping);
      const autoGenerate = isYes(row.generateBarcode);

      // numeric fields (Min/Max only matter when Stock Mapping = Yes)
      const numericFields = {
        thickness: "Thickness", length: "Length", width: "Width", weight: "Weight",
        openingStock: "Opening Stock", stockValue: "Stock Value",
        ...(stockMapping ? { minQty: "Min Qty", maxQty: "Max Qty" } : {}),
      };
      for (const [key, label] of Object.entries(numericFields)) {
        const v = clean(row[key]);
        if (v !== "" && isNaN(Number(v))) return fail(`${label} must be a number`);
      }
      if (
        stockMapping &&
        clean(row.minQty) !== "" && clean(row.maxQty) !== "" &&
        Number(row.minQty) > Number(row.maxQty)
      ) {
        return fail("Min Qty cannot be greater than Max Qty");
      }

      // item code
      const codeKey = itemCode.toLowerCase();
      if (activeCodes.has(codeKey)) return fail("Item code already exists in database");
      if (seenCodes.has(codeKey)) return fail("Duplicate item code within the imported file");

      // barcode: Yes -> generated later (Barcode Number ignored); No/blank -> manual value or null
      const barcode = autoGenerate ? "" : clean(row.barcode);
      const barcodeKey = barcode ? barcode.toLowerCase() : null;
      if (barcodeKey && activeBarcodes.has(barcodeKey)) return fail("Barcode already exists in database");
      if (barcodeKey && seenBarcodes.has(barcodeKey)) return fail("Duplicate barcode within the imported file");

      seenCodes.add(codeKey);
      if (barcodeKey) seenBarcodes.add(barcodeKey);

      normalizedRows.push({
        rowNum,
        itemCode,
        itemName,
        shortName: clean(row.shortName) || itemName,
        hsnCode: clean(row.hsnCode),
        itemLocation: clean(row.itemLocation),
        itemCategoryId,
        groupId,
        unit: clean(row.unit),
        taxSlab: clean(row.taxSlab),
        thickness: clean(row.thickness) || null,
        length: clean(row.length) || null,
        width: clean(row.width) || null,
        weight: clean(row.weight) || null,
        openingStock: clean(row.openingStock) !== "" ? clean(row.openingStock) : 0,
        stockValue: clean(row.stockValue) !== "" ? clean(row.stockValue) : 0,
        stockMapping,
        minQty: stockMapping ? clean(row.minQty) || null : null,
        maxQty: stockMapping ? clean(row.maxQty) || null : null,
        barcode: barcode || null,
        autoGenerate,
      });
    });

    if (errors.length > 0) {
      return errorResponse(res, `Import rejected: ${errors.length} row(s) have errors.`, errors);
    }

    // ---------------- PASS 2: save ----------------
    // Rows with a manual barcode are saved first, so auto-generated barcodes
    // can never collide with a manual ITM000000x from the same file.
    normalizedRows.sort((a, b) => Number(a.autoGenerate) - Number(b.autoGenerate));

    const created = [];

    for (const row of normalizedRows) {
      const deletedItem = deletedItemsByCode.get(row.itemCode.toLowerCase());

      const finalBarcode = row.autoGenerate
        ? await generateBarcodeForCompany(companyId)
        : row.barcode;

      const fields = {
        itemName: row.itemName,
        shortName: row.shortName,
        hsnCode: row.hsnCode,
        itemLocation: row.itemLocation,
        itemCategoryId: row.itemCategoryId,
        groupId: row.groupId,
        unit: row.unit,
        taxSlab: row.taxSlab,
        thickness: row.thickness,
        length: row.length,
        width: row.width,
        weight: row.weight,
        openingStock: row.openingStock,
        openingStock: row.openingStock || 0,
        stockValue: row.stockValue || 0,
        minQty: row.minQty,
        maxQty: row.maxQty,
        barcodeType: row.autoGenerate ? "generate" : "manual",
        barcode: finalBarcode,
        status: "active",
      };

      let savedItem;
      if (deletedItem) {
        // restore the soft-deleted record
        await updateModelHelper(
          "itemmaster",
          { ...fields, createdBy, createdType, delete: 0, updated: new Date() },
          { itemId: deletedItem.itemId, companyId }
        );
        savedItem = { itemId: deletedItem.itemId };
      } else {
        savedItem = await saveModel("itemmaster", {
          companyId,
          itemCode: row.itemCode,
          ...fields,
          createdBy,
          createdType,
          delete: 0,
        });
      }

      created.push({ row: row.rowNum, itemId: savedItem.itemId, itemCode: row.itemCode });
    }

    return successResponse(res, { created }, `${created.length} item(s) imported successfully.`);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Import failed: a barcode or item code is already in use.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};



const getFinishedGoodsItemList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return errorResponse(res, "Company not found.", 401);
    }

    const categoryRows = await selectWithJoins(
      "itemcategory",
      [],
      { companyId, categoryName: "Finished Goods", delete: 0 },
      ["itemCategoryId", "categoryName"]
    );

    if (!categoryRows || categoryRows.length === 0) {
      return successResponse(res, [], "Finished Goods category not found.");
    }

    const itemCategoryId = categoryRows[0].itemCategoryId;

    const items = await selectWithJoins(
      "itemmaster",
      [],
      { companyId, itemCategoryId, delete: 0 },
      ["itemId", "itemCode", "itemName", "shortName", "unit", "status"]
    );

    // Enquiry ke liye: sirf wahi items jinka BOM bana ho aur Active ho
    if (req.query.withBom === "1") {
      const { Op, fn, col, where } = db.Sequelize;

      const activeBoms = await Bom.findAll({
        where: {
          companyId,
          delete: 0,
          [Op.and]: [where(fn("LOWER", col("status")), "active")],
        },
        attributes: ["finishedGoodsItemId", "bomCode"],
        raw: true,
      });

      // 1) jin BOM mein item ka link bhara hai
      const activeIds = new Set(
        activeBoms
          .map((b) => Number(b.finishedGoodsItemId))
          .filter(Boolean)
      );

      // 2) jin BOM mein link NULL hai, unhe bomCode == itemCode se pakdo
      const activeCodes = new Set(
        activeBoms
          .filter((b) => !b.finishedGoodsItemId && b.bomCode)
          .map((b) => String(b.bomCode).trim().toLowerCase())
      );

      const filtered = (items || []).filter(
        (it) =>
          activeIds.has(Number(it.itemId)) ||
          activeCodes.has(String(it.itemCode || "").trim().toLowerCase())
      );

      return successResponse(
        res,
        filtered,
        "Finished Goods items with active BOM fetched successfully."
      );
    }

    // BOM form ka "Select Finished Goods" dropdown: saare Finished Goods
    return successResponse(res, items || [], "Finished Goods items fetched successfully.");
  } catch (error) {
    console.error("getFinishedGoodsItemList error:", error);
    return errorResponse(res, error.message || "Failed to fetch Finished Goods items.", 500);
  }
};

module.exports = {
  getNextBarcode,
  getNextItemCode,
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