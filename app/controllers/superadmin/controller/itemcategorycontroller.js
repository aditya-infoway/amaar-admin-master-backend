const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");


const { syncDefaultItemCategories } = require("./companydetailscontroller.js");


// ---- helper: normalize for case/whitespace-insensitive comparison ----
const normalizeCategoryName = (name) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

// ---- helper: poora item code (prefix + suffix + serialNo), sirf auto me ----
const buildItemCode = (row) => {
  if (row.itemCodeType !== "auto") return "";
  return `${row.prefix || ""}${row.suffix || ""}${row.serialNo || ""}`;
};

// ---- helper: request se item code fields saaf karke deta hai ----
// manual => teeno NULL (chahe frontend kuch bheje), auto => trimmed values
const resolveItemCodeFields = ({ itemCodeType, prefix, suffix, serialNo }) => {
  const type = itemCodeType === "auto" ? "auto" : "manual";
  if (type === "manual") {
    return { itemCodeType: "manual", prefix: null, suffix: null, serialNo: null };
  }
  return {
    itemCodeType: "auto",
    prefix: String(prefix || "").trim(),
    suffix: String(suffix || "").trim() || null,
    serialNo: String(serialNo || "").trim(),
  };
};

// ---- helper: auto item code company-wise unique hai ya nahi ----
// excludeId: update me apna record ignore karne ke liye
const isItemCodeTaken = async (companyId, code, excludeId = null) => {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return false;

  const rows = await selectWithJoins(
    "itemcategory",
    [],
    { companyId, delete: 0 },
    ["itemCategoryId", "itemCodeType", "prefix", "suffix", "serialNo"]
  );

  return rows.some((row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    if (excludeId && String(plain.itemCategoryId) === String(excludeId)) {
      return false;
    }
    return buildItemCode(plain).trim().toLowerCase() === normalized;
  });
};

const ITEM_CATEGORY_FIELDS = [
  "itemCategoryId",
  "companyId",
  "categoryName",
  "status",
  "categoryType",
  "itemCodeType",
  "prefix",
  "suffix",
  "serialNo",
  "createdBy",
  "createdType",
  "created",
];

// ---------------- CREATE ----------------
const createItemCategory = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { categoryName, status, createdBy, createdType } = req.body;
    const cleanName = categoryName.trim().replace(/\s+/g, " ");
    const codeFields = resolveItemCodeFields(req.body);

    // categoryName company-wise unique honi chahiye (case & spacing insensitive)
    const existingRows = await selectWithJoins(
      "itemcategory",
      [],
      { companyId, delete: 0 },
      ["itemCategoryId", "categoryName"]
    );

    const duplicate = existingRows.some(
      (row) => normalizeCategoryName(row.categoryName) === normalizeCategoryName(cleanName)
    );

    if (duplicate) {
      return errorResponse(res, "Item category already exists. Please enter a different name.");
    }

    // item code uniqueness (sirf auto)
    const newItemCode = buildItemCode(codeFields);
    if (await isItemCodeTaken(companyId, newItemCode)) {
      return errorResponse(
        res,
        `Item code "${newItemCode}" already exists. Please use a different prefix/suffix/serial no.`
      );
    }

    const payload = {
      companyId,
      categoryName: cleanName,
      createdBy,
      createdType,
      status,
      ...codeFields,
      delete: 0,
    };

    const itemCategory = await saveModel("itemcategory", payload);

    return successResponse(res, itemCategory, "Item category created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Item category already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getItemCategoryList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    try {
      await syncDefaultItemCategories(companyId);
    } catch (syncError) {
      // TEMPORARY: don't stop listing if sync fails
    }

    const list = await selectWithJoins(
      "itemcategory",
      [],
      { companyId, delete: 0 },
      ITEM_CATEGORY_FIELDS,
      [["itemCategoryId", "DESC"]]
    );

    // createdBy resolve — company ho ya employee
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
      const plain = row.toJSON ? row.toJSON() : row;
      return {
        ...plain,
        itemCode: buildItemCode(plain),
        createdBy:
          companyMap[String(row.createdBy)] ||
          employeeMap[String(row.createdBy)] ||
          row.createdBy,
      };
    });

    return successResponse(res, data, "Item category list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getItemCategoryById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "itemcategory",
      [],
      { itemCategoryId: id, companyId, delete: 0 },
      ITEM_CATEGORY_FIELDS
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Item category not found");
    }

    const categoryRow = rows[0].toJSON ? rows[0].toJSON() : rows[0];
    categoryRow.itemCode = buildItemCode(categoryRow);

    if (categoryRow.createdBy) {
      const companyRows = await selectWithJoins(
        "company",
        [],
        { companyId: categoryRow.createdBy, delete: 0 },
        ["companyId", "companyName"]
      );
      if (companyRows.length > 0) {
        categoryRow.createdBy = companyRows[0].companyName;
      } else {
        const employeeRows = await selectWithJoins(
          "employee",
          [],
          { employeeId: categoryRow.createdBy, delete: 0 },
          ["employeeId", "employeeName"]
        );
        if (employeeRows.length > 0) {
          categoryRow.createdBy = employeeRows[0].employeeName;
        }
      }
    }

    return successResponse(res, categoryRow, "Item category fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateItemCategory = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { itemCategoryId, categoryName, status } = req.body;
    const cleanName = categoryName.trim().replace(/\s+/g, " ");
    const codeFields = resolveItemCodeFields(req.body);

    const existing = await selectWithJoins(
      "itemcategory",
      [],
      { itemCategoryId, companyId, delete: 0 },
      ["itemCategoryId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Item category not found");
    }

    // categoryName uniqueness check — same record ke alawa koi aur is naam se na ho
    // (case & spacing insensitive)
    const allRows = await selectWithJoins(
      "itemcategory",
      [],
      { companyId, delete: 0 },
      ["itemCategoryId", "categoryName"]
    );

    const nameTakenByOther = allRows.some(
      (row) =>
        String(row.itemCategoryId) !== String(itemCategoryId) &&
        normalizeCategoryName(row.categoryName) === normalizeCategoryName(cleanName)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Item category already exists. Please enter a different name.");
    }

    // item code uniqueness (sirf auto, apna record ignore)
    const newItemCode = buildItemCode(codeFields);
    if (await isItemCodeTaken(companyId, newItemCode, itemCategoryId)) {
      return errorResponse(
        res,
        `Item code "${newItemCode}" already exists. Please use a different prefix/suffix/serial no.`
      );
    }

    await updateModelHelper(
      "itemcategory",
      {
        categoryName: cleanName,
        status,
        ...codeFields,
        updated: new Date(),
      },
      { itemCategoryId, companyId }
    );

    return successResponse(res, {}, "Item category updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Item category already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteItemCategory = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { itemCategoryId } = req.body;

    const existing = await selectWithJoins(
      "itemcategory",
      [],
      { itemCategoryId, companyId, delete: 0 },
      ["itemCategoryId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Item category not found");
    }

    await updateModelHelper(
      "itemcategory",
      { delete: 1, updated: new Date() },
      { itemCategoryId, companyId }
    );

    return successResponse(res, {}, "Item category deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createItemCategory,
  getItemCategoryList,
  getItemCategoryById,
  updateItemCategory,
  deleteItemCategory,
};