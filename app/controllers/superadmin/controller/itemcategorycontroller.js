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

// ---------------- CREATE ----------------
const createItemCategory = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { categoryName, status } = req.body;
    const cleanName = categoryName.trim().replace(/\s+/g, " ");

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

    const payload = {
      companyId,
      categoryName: cleanName,
      status,
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
      return requiredmessage(
        res,
        "Unauthorized. Please login again."
      );
    }

    try {
      await syncDefaultItemCategories(companyId);
    } catch (syncError) {
      // TEMPORARY:
      // Don't stop category listing if sync fails.
    }

    const list = await selectWithJoins(
      "itemcategory",
      [],
      {
        companyId,
        delete: 0,
      },
      [
        "itemCategoryId",
        "companyId",
        "categoryName",
        "status",
        "categoryType",
        "created",
      ],
      [["itemCategoryId", "DESC"]]
    );

    return successResponse(
      res,
      list,
      "Item category list fetched successfully"
    );

  } catch (error) {
    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
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
      ["itemCategoryId", "companyId", "categoryName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Item category not found");
    }

    return successResponse(res, rows[0], "Item category fetched successfully");
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

    await updateModelHelper(
      "itemcategory",
      {
        categoryName: cleanName,
        status,
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