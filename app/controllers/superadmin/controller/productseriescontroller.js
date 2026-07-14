const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- Reusable: companyId-wise next seriesCode generate ----------------
// companyId=1 ka PS001...PS015, companyId=2 ka fir se PS001 se start
const generateSeriesCode = async (companyId) => {
  const prefix = "PS";

  const lastRow = await selectWithJoins(
    "productseries",
    [],
    { companyId },
    ["seriesCode"],
    [["productSeriesId", "DESC"]],
    1
  );

  let nextNumber = 1;

  if (lastRow.length > 0 && lastRow[0].seriesCode) {
    const numericPart = parseInt(lastRow[0].seriesCode.replace(prefix, ""), 10);
    if (!isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return prefix + String(nextNumber).padStart(3, "0");
};

// ---------------- CREATE ----------------
const createProductSeries = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { categoryId, seriesName, capacity, status } = req.body;

    // category is company ki hai ya nahi, aur deleted to nahi - check
    const categoryExists = await selectWithJoins(
      "category",
      [],
      { categoryId, companyId, delete: 0 },
      ["categoryId"]
    );

    if (categoryExists.length === 0) {
      return errorResponse(res, "Selected category not found");
    }

    // companyId-wise unique seriesCode generate
    const seriesCode = await generateSeriesCode(companyId);

    const payload = {
      companyId,
      categoryId,
      seriesCode,
      seriesName,
      capacity,
      status,
      delete: 0,
    };

    const series = await saveModel("productseries", payload);

    return successResponse(res, series, "Product series created successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getProductSeriesList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "productseries",
      [],
      { companyId, delete: 0 },
      [
        "productSeriesId",
        "companyId",
        "categoryId",
        "seriesCode",
        "seriesName",
        "capacity",
        "status",
      ],
      [["productSeriesId", "DESC"]]
    );

    return successResponse(res, list, "Product series list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (edit ke liye) ----------------
const getProductSeriesById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "productseries",
      [],
      { productSeriesId: id, companyId, delete: 0 },
      [
        "productSeriesId",
        "companyId",
        "categoryId",
        "seriesCode",
        "seriesName",
        "capacity",
        "status",
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Product series not found");
    }

    return successResponse(res, rows[0], "Product series fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
// seriesCode edit nahi hoga — sirf categoryId, seriesName, capacity, status update honge
const updateProductSeries = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { productSeriesId, categoryId, seriesName, capacity, status } = req.body;

    const existing = await selectWithJoins(
      "productseries",
      [],
      { productSeriesId, companyId, delete: 0 },
      ["productSeriesId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Product series not found");
    }

    const categoryExists = await selectWithJoins(
      "category",
      [],
      { categoryId, companyId, delete: 0 },
      ["categoryId"]
    );

    if (categoryExists.length === 0) {
      return errorResponse(res, "Selected category not found");
    }

    await updateModel(
      "productseries",
      { categoryId, seriesName, capacity, status, updated: new Date() },
      { productSeriesId, companyId }
    );

    return successResponse(res, {}, "Product series updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteProductSeries = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { productSeriesId } = req.body;

    const existing = await selectWithJoins(
      "productseries",
      [],
      { productSeriesId, companyId, delete: 0 },
      ["productSeriesId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Product series not found");
    }

    await updateModel(
      "productseries",
      { delete: 1, updated: new Date() },
      { productSeriesId, companyId }
    );

    return successResponse(res, {}, "Product series deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createProductSeries,
  getProductSeriesList,
  getProductSeriesById,
  updateProductSeries,
  deleteProductSeries,
};