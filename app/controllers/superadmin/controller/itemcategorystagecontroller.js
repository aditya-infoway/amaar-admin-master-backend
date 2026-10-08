const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

const { getFinancialYearById } = require("../../../helper/financialYear.js");

// Frontend ke STAGE_OPTIONS ke sath match rakhna
const STAGE_MAP = {
  cutting: "Cutting",
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ⚠️ Item category table/column ka naam apne DB ke hisaab se badlo
const CATEGORY_TABLE = "itemcategory";
const CATEGORY_ID_COL = "itemCategoryId";
const CATEGORY_NAME_COL = "categoryName";

const getCategoryRow = async (categoryId, companyId) => {
  const rows = await selectWithJoins(
    CATEGORY_TABLE,
    [],
    { [CATEGORY_ID_COL]: categoryId, companyId, delete: 0 },
    [CATEGORY_ID_COL, CATEGORY_NAME_COL],
  );
  return rows[0] || null;
};

// ============================================================
// CREATE
// ============================================================

const createItemCategoryStage = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { financialYearId, stage, categoryId, createdBy, createdType } =
      req.body;

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );
    }

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    if (!STAGE_MAP[stage]) {
      return errorResponse(res, "Invalid stage selected.");
    }

    const normalizedCategoryId = normalizeId(categoryId);
    if (!normalizedCategoryId) {
      return errorResponse(res, "Please select an item category.");
    }

    const category = await getCategoryRow(normalizedCategoryId, companyId);
    if (!category) {
      return errorResponse(res, "Selected item category was not found.");
    }

    const duplicate = await selectWithJoins(
      "itemcategorystage",
      [],
      {
        companyId,
        financialYearId: fy.financialYearId,
        stage,
        categoryId: normalizedCategoryId,
        delete: 0,
      },
      ["itemCategoryStageId"],
    );
    if (duplicate.length > 0) {
      return errorResponse(
        res,
        "This item category is already added for the selected stage.",
      );
    }

    const saved = await saveModel("itemcategorystage", {
      companyId,
      financialYearId: fy.financialYearId,
      stage,
      categoryId: normalizedCategoryId,
      createdBy: req.employeeId ? String(req.employeeId) : createdBy || null,
      createdtype: req.employeeId ? "Sale Executive" : createdType || null,
      delete: 0,
    });

    return successResponse(
      res,
      {
        itemCategoryStageId: saved.itemCategoryStageId,
        financialYearId: fy.financialYearId,
        stage,
        stageName: STAGE_MAP[stage],
        categoryId: normalizedCategoryId,
        categoryName: category[CATEGORY_NAME_COL] || "",
      },
      "Item category saved successfully",
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This item category already exists.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// LIST
// ============================================================

const getItemCategoryStageList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { financialYearId } = req.query;

    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const rows = await selectWithJoins(
      "itemcategorystage",
      [],
      where,
      [
        "itemCategoryStageId",
        "financialYearId",
        "stage",
        "categoryId",
        "created",
        "updated",
      ],
      [["itemCategoryStageId", "DESC"]],
    );

    if (!rows.length) {
      return successResponse(res, [], "Item category list fetched successfully");
    }

    const categoryIds = [...new Set(rows.map((r) => r.categoryId))];

    let categoryMap = {};
    try {
      const categories = await selectWithJoins(
        CATEGORY_TABLE,
        [],
        { [CATEGORY_ID_COL]: categoryIds, companyId },
        [CATEGORY_ID_COL, CATEGORY_NAME_COL],
      );
      categoryMap = categories.reduce((map, c) => {
        map[String(c[CATEGORY_ID_COL])] = c[CATEGORY_NAME_COL] || "";
        return map;
      }, {});
    } catch (err) {
      console.error("Error fetching item categories:", err.message);
    }

    const data = rows.map((r) => ({
      id: String(r.itemCategoryStageId),
      financialYearId: r.financialYearId,
      stage: r.stage,
      stageName: STAGE_MAP[r.stage] || r.stage,
      categoryId: String(r.categoryId),
      categoryName: categoryMap[String(r.categoryId)] || "",
      createdAt: r.created,
      updatedAt: r.updated,
    }));

    return successResponse(res, data, "Item category list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// UPDATE
// ============================================================

const updateItemCategoryStage = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;
    if (!id) return errorResponse(res, "Id is required.");

    const existing = await selectWithJoins(
      "itemcategorystage",
      [],
      { itemCategoryStageId: id, companyId, delete: 0 },
      ["itemCategoryStageId"],
    );
    if (!existing.length) {
      return requiredmessage(res, "Record not found.");
    }

    const { financialYearId, stage, categoryId } = req.body;

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );
    }

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    if (!STAGE_MAP[stage]) {
      return errorResponse(res, "Invalid stage selected.");
    }

    const normalizedCategoryId = normalizeId(categoryId);
    if (!normalizedCategoryId) {
      return errorResponse(res, "Please select an item category.");
    }

    const category = await getCategoryRow(normalizedCategoryId, companyId);
    if (!category) {
      return errorResponse(res, "Selected item category was not found.");
    }

    const duplicate = await selectWithJoins(
      "itemcategorystage",
      [],
      {
        companyId,
        financialYearId: fy.financialYearId,
        stage,
        categoryId: normalizedCategoryId,
        delete: 0,
      },
      ["itemCategoryStageId"],
    );
    const another = duplicate.find(
      (item) => String(item.itemCategoryStageId) !== String(id),
    );
    if (another) {
      return errorResponse(
        res,
        "This item category is already added for the selected stage.",
      );
    }

    await updateModelHelper(
      "itemcategorystage",
      {
        financialYearId: fy.financialYearId,
        stage,
        categoryId: normalizedCategoryId,
        updated: new Date(),
      },
      { itemCategoryStageId: id, companyId, delete: 0 },
    );

    return successResponse(
      res,
      {
        itemCategoryStageId: Number(id),
        financialYearId: fy.financialYearId,
        stage,
        stageName: STAGE_MAP[stage],
        categoryId: normalizedCategoryId,
        categoryName: category[CATEGORY_NAME_COL] || "",
      },
      "Item category updated successfully",
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This item category already exists.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// DELETE (soft)
// ============================================================

const deleteItemCategoryStage = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;
    if (!id) return errorResponse(res, "Id is required.");

    const existing = await selectWithJoins(
      "itemcategorystage",
      [],
      { itemCategoryStageId: id, companyId, delete: 0 },
      ["itemCategoryStageId"],
    );
    if (!existing.length) {
      return requiredmessage(res, "Record not found.");
    }

    await updateModelHelper(
      "itemcategorystage",
      { delete: 1, updated: new Date() },
      { itemCategoryStageId: id, companyId },
    );

    return successResponse(
      res,
      { itemCategoryStageId: Number(id) },
      "Item category deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  createItemCategoryStage,
  getItemCategoryStageList,
  updateItemCategoryStage,
  deleteItemCategoryStage,
};