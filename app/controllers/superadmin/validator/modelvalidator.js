const Joi = require("joi");

const createModel = Joi.object().keys({
  categoryId: Joi.number().required().messages({
    "number.base": "Please select a category",
    "any.required": "Please select a category",
  }),
  seriesId: Joi.number().required().messages({
    "number.base": "Please select a series",
    "any.required": "Please select a series",
  }),
  modelCode: Joi.string().trim().required().messages({
    "string.empty": "Model code is required",
  }),
  modelName: Joi.string().trim().required().messages({
    "string.empty": "Model name is required",
  }),
  axleType: Joi.string().trim().required().messages({
    "string.empty": "Axle type is required",
  }),
  capacity: Joi.string().trim().required().messages({
    "string.empty": "Capacity is required",
  }),
  length: Joi.string().trim().required().messages({
    "string.empty": "Length is required",
  }),
  width: Joi.string().trim().required().messages({
    "string.empty": "Width is required",
  }),
  height: Joi.string().trim().required().messages({
    "string.empty": "Height is required",
  }),
  standardWeight: Joi.string().trim().required().messages({
    "string.empty": "Standard weight is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateModel = Joi.object().keys({
  modelId: Joi.number().required().messages({
    "number.base": "Model id is required",
  }),
  categoryId: Joi.number().required().messages({
    "number.base": "Please select a category",
    "any.required": "Please select a category",
  }),
  seriesId: Joi.number().required().messages({
    "number.base": "Please select a series",
    "any.required": "Please select a series",
  }),
  modelCode: Joi.string().trim().required().messages({
    "string.empty": "Model code is required",
  }),
  modelName: Joi.string().trim().required().messages({
    "string.empty": "Model name is required",
  }),
  axleType: Joi.string().trim().required().messages({
    "string.empty": "Axle type is required",
  }),
  capacity: Joi.string().trim().required().messages({
    "string.empty": "Capacity is required",
  }),
  length: Joi.string().trim().required().messages({
    "string.empty": "Length is required",
  }),
  width: Joi.string().trim().required().messages({
    "string.empty": "Width is required",
  }),
  height: Joi.string().trim().required().messages({
    "string.empty": "Height is required",
  }),
  standardWeight: Joi.string().trim().required().messages({
    "string.empty": "Standard weight is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteModel = Joi.object().keys({
  modelId: Joi.number().required().messages({
    "number.base": "Model id is required",
  }),
});

module.exports = { createModel, updateModel, deleteModel };