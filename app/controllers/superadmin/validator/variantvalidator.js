const Joi = require("joi");

const createVariant = Joi.object().keys({
  categoryId: Joi.number().required().messages({
    "number.base": "Category is required",
  }),
  seriesId: Joi.number().required().messages({
    "number.base": "Series is required",
  }),
  modelId: Joi.number().required().messages({
    "number.base": "Model is required",
  }),
  variantCode: Joi.string().trim().required().messages({
    "string.empty": "Variant code is required",
  }),
  variantName: Joi.string().trim().required().messages({
    "string.empty": "Variant name is required",
  }),
  bodyTypeId: Joi.number().required().messages({
    "number.base": "Body type is required",
  }),
  axleBrandId: Joi.number().required().messages({
    "number.base": "Axle brand is required",
  }),
  hydraulicBrandId: Joi.number().required().messages({
    "number.base": "Hydraulic brand is required",
  }),
  tyreBrandId: Joi.number().required().messages({
    "number.base": "Tyre brand is required",
  }),
  targetCost: Joi.number().required().messages({
    "number.base": "Target cost is required",
  }),
  sellingPrice: Joi.number().required().messages({
    "number.base": "Selling price is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateVariant = createVariant.keys({
  variantId: Joi.number().required().messages({
    "number.base": "Variant id is required",
  }),
});

const deleteVariant = Joi.object().keys({
  variantId: Joi.number().required().messages({
    "number.base": "Variant id is required",
  }),
});

module.exports = { createVariant, updateVariant, deleteVariant };