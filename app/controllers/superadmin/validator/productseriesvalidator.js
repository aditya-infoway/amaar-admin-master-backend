const Joi = require("joi");

const createProductSeries = Joi.object().keys({
  categoryId: Joi.number().required().messages({
    "number.base": "Please select a category",
    "any.required": "Please select a category",
  }),
  seriesName: Joi.string().trim().required().messages({
    "string.empty": "Series name is required",
  }),
  capacity: Joi.string().trim().required().messages({
    "string.empty": "Capacity is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateProductSeries = Joi.object().keys({
  productSeriesId: Joi.number().required().messages({
    "number.base": "Product series id is required",
  }),
  categoryId: Joi.number().required().messages({
    "number.base": "Please select a category",
    "any.required": "Please select a category",
  }),
  seriesName: Joi.string().trim().required().messages({
    "string.empty": "Series name is required",
  }),
  capacity: Joi.string().trim().required().messages({
    "string.empty": "Capacity is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteProductSeries = Joi.object().keys({
  productSeriesId: Joi.number().required().messages({
    "number.base": "Product series id is required",
  }),
});

module.exports = { createProductSeries, updateProductSeries, deleteProductSeries };