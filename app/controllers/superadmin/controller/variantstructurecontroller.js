const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- JSON safe parse ----------------
const safeParse = (val) => {
  try {
    return val ? JSON.parse(val) : {};
  } catch (e) {
    return {};
  }
};

// ---------------- Variant ke related saare display names attach karo ----------------
const enrichWithVariantInfo = async (companyId, row) => {
  const variantRows = await selectWithJoins(
    "variant", [], { variantId: row.variantId, companyId, delete: 0 },
    ["variantId", "categoryId", "seriesId", "modelId", "variantCode", "variantName",
      "bodyTypeId", "axleBrandId", "hydraulicBrandId", "tyreBrandId", "targetCost", "sellingPrice"]
  );
  if (variantRows.length === 0) return row;
  const v = variantRows[0];

  const [cat, series, model, bodyType, axleBrand, hydraulicBrand, tyreBrand] = await Promise.all([
    selectWithJoins("category", [], { categoryId: v.categoryId, delete: 0 }, ["categoryName","code"]),
    selectWithJoins("productseries", [], { productSeriesId: v.seriesId, delete: 0 }, ["seriesName","seriesCode"]),
    selectWithJoins("model", [], { modelId: v.modelId, delete: 0 }, ["modelName","modelCode","capacity","length","width","height","standardWeight"]),
    selectWithJoins("bodytype", [], { bodyTypeId: v.bodyTypeId, delete: 0 }, ["bodyTypeName"]),
    selectWithJoins("axlebrand", [], { axleBrandId: v.axleBrandId, delete: 0 }, ["axleBrandName"]),
    selectWithJoins("hydraulicbrand", [], { hydraulicBrandId: v.hydraulicBrandId, delete: 0 }, ["hydraulicBrandName"]),
    selectWithJoins("tyrebrand", [], { tyreBrandId: v.tyreBrandId, delete: 0 }, ["tyreBrandName"]),
  ]);

  return {
    ...row,
    variantCode: v.variantCode,
    variantName: v.variantName,
    categoryName: cat[0]?.categoryName || "",
    categoryCode: cat[0]?.code || "",
    seriesName: series[0]?.seriesName || "",
    seriesCode: series[0]?.seriesCode || "",
    modelName: model[0]?.modelName || "",
    modelCode: model[0]?.modelCode || "",
    capacity: model[0]?.capacity || "",
    length: model[0]?.length || "",
    width: model[0]?.width || "",
    height: model[0]?.height || "",
    standardWeight: model[0]?.standardWeight || "",
    bodyType: bodyType[0]?.bodyTypeName || "",
    axleBrand: axleBrand[0]?.axleBrandName || "",
    hydraulicBrand: hydraulicBrand[0]?.hydraulicBrandName || "",
    tyreBrand: tyreBrand[0]?.tyreBrandName || "",
    targetCost: v.targetCost,
    sellingPrice: v.sellingPrice,
  };
};

// ---------------- CREATE ----------------
const createVariantStructure = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      variantId, bodyLength, bodyWidth, bodyHeight, capacity, axleCount,
      suspensionType, tyreSize, kingPin, brakeSystem, hydraulicDetails,
      paintType, floorPlateThk, sidePlateThk, chassisType, etc,
      standardFeatures, optionalAccessories,
      productImage, brochurePdf, drawingPdf, specSheet, status,
    } = req.body;

    // variant company ka hi ho aur exist kare
    const variantExists = await selectWithJoins(
      "variant", [], { variantId, companyId, delete: 0 }, ["variantId"]
    );
    if (variantExists.length === 0) {
      return errorResponse(res, "Selected variant not found");
    }

    // 1 variant = 1 hi structure allowed
    const alreadyUsed = await selectWithJoins(
      "variantstructure", [], { variantId, companyId, delete: 0 }, ["variantStructureId"]
    );
    if (alreadyUsed.length > 0) {
      return errorResponse(res, "A structure already exists for this variant.");
    }

    const payload = {
      companyId,
      variantId,
      bodyLength,
      bodyWidth: bodyWidth || null,
      bodyHeight: bodyHeight || null,
      capacity: capacity || null,
      axleCount: axleCount || null,
      suspensionType: suspensionType || null,
      tyreSize: tyreSize || null,
      kingPin: kingPin || null,
      brakeSystem: brakeSystem || null,
      hydraulicDetails: hydraulicDetails || null,
      paintType: paintType || null,
      floorPlateThk: floorPlateThk || null,
      sidePlateThk: sidePlateThk || null,
      chassisType: chassisType || null,
      etc: etc || null,
      standardFeatures: JSON.stringify(standardFeatures || {}),
      optionalAccessories: JSON.stringify(optionalAccessories || {}),
      productImage: productImage || null,
      brochurePdf: brochurePdf || null,
      drawingPdf: drawingPdf || null,
      specSheet: specSheet || null,
      status: status || "active",
      delete: 0,
    };

    const created = await saveModel("variantstructure", payload);

    return successResponse(res, created, "Variant structure created successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getVariantStructureList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoins(
      "variantstructure", [], { companyId, delete: 0 },
      [
        "variantStructureId", "companyId", "variantId", "bodyLength", "bodyWidth",
        "bodyHeight", "capacity", "axleCount", "suspensionType", "tyreSize", "kingPin",
        "brakeSystem", "hydraulicDetails", "paintType", "floorPlateThk", "sidePlateThk",
        "chassisType", "etc", "standardFeatures", "optionalAccessories",
        "productImage", "brochurePdf", "drawingPdf", "specSheet", "status", "created",
      ],
      [["variantStructureId", "DESC"]]
    );

    const enriched = await Promise.all(
      list.map(async (row) => {
        const withVariant = await enrichWithVariantInfo(companyId, row);
        return {
          ...withVariant,
          standardFeatures: safeParse(row.standardFeatures),
          optionalAccessories: safeParse(row.optionalAccessories),
        };
      })
    );

    return successResponse(res, enriched, "Variant structure list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getVariantStructureById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const rows = await selectWithJoins(
      "variantstructure", [], { variantStructureId: id, companyId, delete: 0 },
      [
        "variantStructureId", "companyId", "variantId", "bodyLength", "bodyWidth",
        "bodyHeight", "capacity", "axleCount", "suspensionType", "tyreSize", "kingPin",
        "brakeSystem", "hydraulicDetails", "paintType", "floorPlateThk", "sidePlateThk",
        "chassisType", "etc", "standardFeatures", "optionalAccessories",
        "productImage", "brochurePdf", "drawingPdf", "specSheet", "status", "created",
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Variant structure not found");
    }

    const row = await enrichWithVariantInfo(companyId, rows[0]);
    row.standardFeatures = safeParse(rows[0].standardFeatures);
    row.optionalAccessories = safeParse(rows[0].optionalAccessories);

    return successResponse(res, row, "Variant structure fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE (variantId kabhi change nahi hota) ----------------
const updateVariantStructure = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      variantStructureId, bodyLength, bodyWidth, bodyHeight, capacity, axleCount,
      suspensionType, tyreSize, kingPin, brakeSystem, hydraulicDetails,
      paintType, floorPlateThk, sidePlateThk, chassisType, etc,
      standardFeatures, optionalAccessories,
      productImage, brochurePdf, drawingPdf, specSheet, status,
    } = req.body;

    const existing = await selectWithJoins(
      "variantstructure", [], { variantStructureId, companyId, delete: 0 },
      ["variantStructureId", "variantId"]
    );
    if (existing.length === 0) {
      return requiredmessage(res, "Variant structure not found");
    }

    // NOTE: request me variantId aaye bhi to yahan ignore hota hai — edit me variant fix rehta hai
    await updateModelHelper(
      "variantstructure",
      {
        bodyLength,
        bodyWidth: bodyWidth || null,
        bodyHeight: bodyHeight || null,
        capacity: capacity || null,
        axleCount: axleCount || null,
        suspensionType: suspensionType || null,
        tyreSize: tyreSize || null,
        kingPin: kingPin || null,
        brakeSystem: brakeSystem || null,
        hydraulicDetails: hydraulicDetails || null,
        paintType: paintType || null,
        floorPlateThk: floorPlateThk || null,
        sidePlateThk: sidePlateThk || null,
        chassisType: chassisType || null,
        etc: etc || null,
        standardFeatures: JSON.stringify(standardFeatures || {}),
        optionalAccessories: JSON.stringify(optionalAccessories || {}),
        productImage: productImage || null,
        brochurePdf: brochurePdf || null,
        drawingPdf: drawingPdf || null,
        specSheet: specSheet || null,
        status: status || "active",
        updated: new Date(),
      },
      { variantStructureId, companyId }
    );

    return successResponse(res, {}, "Variant structure updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteVariantStructure = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { variantStructureId } = req.body;

    const existing = await selectWithJoins(
      "variantstructure", [], { variantStructureId, companyId, delete: 0 }, ["variantStructureId"]
    );
    if (existing.length === 0) {
      return requiredmessage(res, "Variant structure not found");
    }

    await updateModelHelper(
      "variantstructure",
      { delete: 1, updated: new Date() },
      { variantStructureId, companyId }
    );

    return successResponse(res, {}, "Variant structure deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- Sirf un variants ki list jinki abhi tak structure nahi bani ----------------
const getAvailableVariants = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const usedRows = await selectWithJoins(
      "variantstructure", [], { companyId, delete: 0 }, ["variantId"]
    );
    const usedVariantIds = usedRows.map((row) => row.variantId);

    const allVariants = await selectWithJoins(
      "variant", [], { companyId, delete: 0 },
      [
        "variantId", "categoryId", "seriesId", "modelId", "variantCode", "variantName",
        "bodyTypeId", "axleBrandId", "hydraulicBrandId", "tyreBrandId",
        "targetCost", "sellingPrice", "status",
      ],
      [["variantId", "DESC"]]
    );

    const available = allVariants.filter((item) => !usedVariantIds.includes(item.variantId));

    return successResponse(res, available, "Available variants fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createVariantStructure,
  getVariantStructureList,
  getVariantStructureById,
  updateVariantStructure,
  deleteVariantStructure,
  getAvailableVariants,
};