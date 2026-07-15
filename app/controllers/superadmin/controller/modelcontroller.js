const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createModel = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      categoryId,
      seriesId,
      modelCode,
      modelName,
      capacity,
      length,
      width,
      height,
      standardWeight,
      status,
    } = req.body;

    // category company ki hai ya nahi
    const categoryExists = await selectWithJoins(
      "category",
      [],
      { categoryId, companyId, delete: 0 },
      ["categoryId"]
    );

    if (categoryExists.length === 0) {
      return errorResponse(res, "Selected category not found");
    }

    // series company + category ki hai ya nahi
    const seriesExists = await selectWithJoins(
      "productseries",
      [],
      { productSeriesId: seriesId, categoryId, companyId, delete: 0 },
      ["productSeriesId"]
    );

    if (seriesExists.length === 0) {
      return errorResponse(res, "Selected series not found");
    }

    // modelCode company-wise unique honi chahiye (user-entered)
    const codeExists = await selectWithJoins(
      "model",
      [],
      { modelCode: modelCode.trim(), companyId, delete: 0 },
      ["modelId"]
    );

    if (codeExists.length > 0) {
      return errorResponse(res, "Model code already exists. Please enter a different code.");
    }

    const payload = {
      companyId,
      categoryId,
      seriesId,
      modelCode: modelCode.trim(),
      modelName,
      capacity,
      length,
      width,
      height,
      standardWeight,
      status,
      delete: 0,
    };

    const model = await saveModel("model", payload);

    return successResponse(res, model, "Model created successfully");
  } catch (error) {
    // DB level unique constraint bhi catch karo (race condition safety)
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Model code already exists. Please enter a different code.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getModelList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "model",
      [],
      { companyId, delete: 0 },
      [
        "modelId",
        "companyId",
        "categoryId",
        "seriesId",
        "modelCode",
        "modelName",
        "capacity",
        "length",
        "width",
        "height",
        "standardWeight",
        "status",
      ],
      [["modelId", "DESC"]]
    );

    return successResponse(res, list, "Model list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getModelById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "model",
      [],
      { modelId: id, companyId, delete: 0 },
      [
        "modelId",
        "companyId",
        "categoryId",
        "seriesId",
        "modelCode",
        "modelName",
        "capacity",
        "length",
        "width",
        "height",
        "standardWeight",
        "status",
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Model not found");
    }

    return successResponse(res, rows[0], "Model fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateModel = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      modelId,
      categoryId,
      seriesId,
      modelCode,
      modelName,
      capacity,
      length,
      width,
      height,
      standardWeight,
      status,
    } = req.body;

    const existing = await selectWithJoins(
      "model",
      [],
      { modelId, companyId, delete: 0 },
      ["modelId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Model not found");
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

    const seriesExists = await selectWithJoins(
      "productseries",
      [],
      { productSeriesId: seriesId, categoryId, companyId, delete: 0 },
      ["productSeriesId"]
    );

    if (seriesExists.length === 0) {
      return errorResponse(res, "Selected series not found");
    }

    // modelCode uniqueness check — same record ke alawa koi aur is code se na ho
    const codeExists = await selectWithJoins(
      "model",
      [],
      { modelCode: modelCode.trim(), companyId, delete: 0 },
      ["modelId"]
    );

    const codeTakenByOther = codeExists.some(
      (row) => String(row.modelId) !== String(modelId)
    );

    if (codeTakenByOther) {
      return errorResponse(res, "Model code already exists. Please enter a different code.");
    }

    await updateModelHelper(
      "model",
      {
        categoryId,
        seriesId,
        modelCode: modelCode.trim(),
        modelName,
        capacity,
        length,
        width,
        height,
        standardWeight,
        status,
        updated: new Date(),
      },
      { modelId, companyId }
    );

    return successResponse(res, {}, "Model updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Model code already exists. Please enter a different code.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteModel = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { modelId } = req.body;

    const existing = await selectWithJoins(
      "model",
      [],
      { modelId, companyId, delete: 0 },
      ["modelId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Model not found");
    }

    await updateModelHelper(
      "model",
      { delete: 1, updated: new Date() },
      { modelId, companyId }
    );

    return successResponse(res, {}, "Model deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createModel,
  getModelList,
  getModelById,
  updateModel,
  deleteModel,
};