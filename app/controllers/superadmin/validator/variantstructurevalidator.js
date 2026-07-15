const Joi = require("joi");

const createVariantStructure = Joi.object().keys({
  variantId: Joi.number().required().messages({
    "number.base": "Variant is required",
  }),
  // sirf Body Length required — baaki sab optional (jaisa maanga gaya hai)
  bodyLength: Joi.string().trim().required().messages({
    "string.empty": "Body Length is required",
  }),
  bodyWidth: Joi.string().trim().allow("", null),
  bodyHeight: Joi.string().trim().allow("", null),
  capacity: Joi.string().trim().allow("", null),
  axleCount: Joi.string().trim().allow("", null),
  suspensionType: Joi.string().trim().allow("", null),
  tyreSize: Joi.string().trim().allow("", null),
  kingPin: Joi.string().trim().allow("", null),
  brakeSystem: Joi.string().trim().allow("", null),
  hydraulicDetails: Joi.string().trim().allow("", null),
  paintType: Joi.string().trim().allow("", null),
  floorPlateThk: Joi.string().trim().allow("", null),
  sidePlateThk: Joi.string().trim().allow("", null),
  chassisType: Joi.string().trim().allow("", null),
  etc: Joi.string().trim().allow("", null),
  standardFeatures: Joi.object().unknown(true).allow(null),
  optionalAccessories: Joi.object().unknown(true).allow(null),
  productImage: Joi.string().trim().allow("", null),
  brochurePdf: Joi.string().trim().allow("", null),
  drawingPdf: Joi.string().trim().allow("", null),
  specSheet: Joi.string().trim().allow("", null),
  status: Joi.string().valid("active", "inactive").allow("", null),
});

const updateVariantStructure = createVariantStructure.keys({
  variantStructureId: Joi.number().required().messages({
    "number.base": "Variant structure id is required",
  }),
  // update me variantId zaroori nahi (bheja bhi jaye to controller ignore karta hai)
  variantId: Joi.number().optional(),
});

const deleteVariantStructure = Joi.object().keys({
  variantStructureId: Joi.number().required().messages({
    "number.base": "Variant structure id is required",
  }),
});

module.exports = { createVariantStructure, updateVariantStructure, deleteVariantStructure };