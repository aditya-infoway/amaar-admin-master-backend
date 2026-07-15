const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- Reusable: related master records validate karo ----------------
const validateRelatedMasters = async (companyId, { categoryId, seriesId, modelId, bodyTypeId, axleBrandId, hydraulicBrandId, tyreBrandId }) => {
  const categoryExists = await selectWithJoins(
    "category",
    [],
    { categoryId, companyId, delete: 0 },
    ["categoryId"]
  );
  if (categoryExists.length === 0) return "Selected category not found";

  const seriesExists = await selectWithJoins(
    "productseries",
    [],
    { productSeriesId: seriesId, categoryId, companyId, delete: 0 },
    ["productSeriesId"]
  );
  if (seriesExists.length === 0) return "Selected series not found";

  const modelExists = await selectWithJoins(
    "model",
    [],
    { modelId, seriesId, companyId, delete: 0 },
    ["modelId"]
  );
  if (modelExists.length === 0) return "Selected model not found";

  const bodyTypeExists = await selectWithJoins(
    "bodytype",
    [],
    { bodyTypeId, companyId, delete: 0 },
    ["bodyTypeId"]
  );
  if (bodyTypeExists.length === 0) return "Selected body type not found";

  const axleBrandExists = await selectWithJoins(
    "axlebrand",
    [],
    { axleBrandId, companyId, delete: 0 },
    ["axleBrandId"]
  );
  if (axleBrandExists.length === 0) return "Selected axle brand not found";

  const hydraulicBrandExists = await selectWithJoins(
    "hydraulicbrand",
    [],
    { hydraulicBrandId, companyId, delete: 0 },
    ["hydraulicBrandId"]
  );
  if (hydraulicBrandExists.length === 0) return "Selected hydraulic brand not found";

  const tyreBrandExists = await selectWithJoins(
    "tyrebrand",
    [],
    { tyreBrandId, companyId, delete: 0 },
    ["tyreBrandId"]
  );
  if (tyreBrandExists.length === 0) return "Selected tyre brand not found";

  return null;
};

// ---------------- CREATE ----------------
const createVariant = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      categoryId, seriesId, modelId, variantCode, variantName,
      bodyTypeId, axleBrandId, hydraulicBrandId, tyreBrandId,
      targetCost, sellingPrice, status,
    } = req.body;

    const validationError = await validateRelatedMasters(companyId, {
      categoryId, seriesId, modelId, bodyTypeId, axleBrandId, hydraulicBrandId, tyreBrandId,
    });
    if (validationError) {
      return errorResponse(res, validationError);
    }

    const codeExists = await selectWithJoins(
      "variant",
      [],
      { variantCode: variantCode.trim(), companyId, delete: 0 },
      ["variantId"]
    );

    if (codeExists.length > 0) {
      return errorResponse(res, "Variant code already exists. Please enter a different code.");
    }

    const payload = {
      companyId,
      categoryId,
      seriesId,
      modelId,
      variantCode: variantCode.trim(),
      variantName,
      bodyTypeId,
      axleBrandId,
      hydraulicBrandId,
      tyreBrandId,
      targetCost,
      sellingPrice,
      status,
      delete: 0,
    };

    const variant = await saveModel("variant", payload);

    return successResponse(res, variant, "Variant created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Variant code already exists. Please enter a different code.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getVariantList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "variant",
      [],
      { companyId, delete: 0 },
      [
        "variantId", "companyId", "categoryId", "seriesId", "modelId",
        "variantCode", "variantName", "bodyTypeId", "axleBrandId",
        "hydraulicBrandId", "tyreBrandId", "targetCost", "sellingPrice",
        "status", "created",
      ],
      [["variantId", "DESC"]]
    );

    return successResponse(res, list, "Variant list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getVariantById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "variant",
      [],
      { variantId: id, companyId, delete: 0 },
      [
        "variantId", "companyId", "categoryId", "seriesId", "modelId",
        "variantCode", "variantName", "bodyTypeId", "axleBrandId",
        "hydraulicBrandId", "tyreBrandId", "targetCost", "sellingPrice",
        "status", "created",
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Variant not found");
    }

    return successResponse(res, rows[0], "Variant fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateVariant = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      variantId, categoryId, seriesId, modelId, variantCode, variantName,
      bodyTypeId, axleBrandId, hydraulicBrandId, tyreBrandId,
      targetCost, sellingPrice, status,
    } = req.body;

    const existing = await selectWithJoins(
      "variant",
      [],
      { variantId, companyId, delete: 0 },
      ["variantId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Variant not found");
    }

    const validationError = await validateRelatedMasters(companyId, {
      categoryId, seriesId, modelId, bodyTypeId, axleBrandId, hydraulicBrandId, tyreBrandId,
    });
    if (validationError) {
      return errorResponse(res, validationError);
    }

    const codeExists = await selectWithJoins(
      "variant",
      [],
      { variantCode: variantCode.trim(), companyId, delete: 0 },
      ["variantId"]
    );

    const codeTakenByOther = codeExists.some(
      (row) => String(row.variantId) !== String(variantId)
    );

    if (codeTakenByOther) {
      return errorResponse(res, "Variant code already exists. Please enter a different code.");
    }

    await updateModelHelper(
      "variant",
      {
        categoryId,
        seriesId,
        modelId,
        variantCode: variantCode.trim(),
        variantName,
        bodyTypeId,
        axleBrandId,
        hydraulicBrandId,
        tyreBrandId,
        targetCost,
        sellingPrice,
        status,
        updated: new Date(),
      },
      { variantId, companyId }
    );

    return successResponse(res, {}, "Variant updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Variant code already exists. Please enter a different code.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteVariant = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { variantId } = req.body;

    const existing = await selectWithJoins(
      "variant",
      [],
      { variantId, companyId, delete: 0 },
      ["variantId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Variant not found");
    }

    await updateModelHelper(
      "variant",
      { delete: 1, updated: new Date() },
      { variantId, companyId }
    );

    return successResponse(res, {}, "Variant deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createVariant,
  getVariantList,
  getVariantById,
  updateVariant,
  deleteVariant,
};