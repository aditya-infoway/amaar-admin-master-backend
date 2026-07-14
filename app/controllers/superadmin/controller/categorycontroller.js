const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- Reusable: companyId-wise next code generate ----------------
// companyId=1 ka CAT001...CAT015, companyId=2 ka fir se CAT001 se start
const generateCategoryCode = async (companyId) => {
  const prefix = "CAT";

  const lastRow = await selectWithJoins(
    "category",
    [],
    { companyId },
    ["code"],
    [["categoryId", "DESC"]],
    1
  );

  let nextNumber = 1;

  if (lastRow.length > 0 && lastRow[0].code) {
    const numericPart = parseInt(lastRow[0].code.replace(prefix, ""), 10);
    if (!isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return prefix + String(nextNumber).padStart(3, "0");
};

// ---------------- CREATE ----------------
const createCategory = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { categoryName, status } = req.body;

    // duplicate check
    const exists = await selectWithJoins(
      "category",
      [],
      { companyId, categoryName, delete: 0 },
      ["categoryId"]
    );

    if (exists.length > 0) {
      return errorResponse(res, "Category name already exists");
    }

    // companyId-wise unique code generate
    const code = await generateCategoryCode(companyId);

    const payload = {
      companyId,
      code,
      categoryName,
      status,
      delete: 0,
    };

    const category = await saveModel("category", payload);

    return successResponse(res, category, "Category created successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getCategoryList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "category",
      [],
      { companyId, delete: 0 },
      ["categoryId", "companyId", "code", "categoryName", "status"],
      [["categoryId", "DESC"]]
    );

    return successResponse(res, list, "Category list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (edit ke liye) ----------------
const getCategoryById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "category",
      [],
      { categoryId: id, companyId, delete: 0 },
      ["categoryId", "companyId", "code", "categoryName", "status"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Category not found");
    }

    return successResponse(res, rows[0], "Category fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateCategory = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { categoryId, categoryName, status } = req.body;

    // record exist check
    const existing = await selectWithJoins(
      "category",
      [],
      { categoryId, companyId, delete: 0 },
      ["categoryId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Category not found");
    }

    // duplicate name check (isi categoryId ko chhod ke)
    const allSameName = await selectWithJoins(
      "category",
      [],
      { companyId, categoryName, delete: 0 },
      ["categoryId"]
    );

    const duplicateFound = allSameName.some(
      (row) => Number(row.categoryId) !== Number(categoryId)
    );

    if (duplicateFound) {
      return errorResponse(res, "Category name already exists");
    }

    await updateModel(
      "category",
      { categoryName, status, updated: new Date() },
      { categoryId, companyId }
    );

    return successResponse(res, {}, "Category updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteCategory = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { categoryId } = req.body;

    const existing = await selectWithJoins(
      "category",
      [],
      { categoryId, companyId, delete: 0 },
      ["categoryId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Category not found");
    }

    await updateModel(
      "category",
      { delete: 1, updated: new Date() },
      { categoryId, companyId }
    );

    return successResponse(res, {}, "Category deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createCategory,
  getCategoryList,
  getCategoryById,
  updateCategory,
  deleteCategory,
};