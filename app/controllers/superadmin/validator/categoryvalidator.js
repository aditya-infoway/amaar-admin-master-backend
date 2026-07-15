const Joi = require("joi");

const createCategory = Joi.object().keys({
  categoryName: Joi.string().trim().required().messages({
    "string.empty": "Category name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateCategory = Joi.object().keys({
  categoryId: Joi.number().required().messages({
    "number.base": "Category id is required",
  }),
  categoryName: Joi.string().trim().required().messages({
    "string.empty": "Category name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteCategory = Joi.object().keys({
  categoryId: Joi.number().required().messages({
    "number.base": "Category id is required",
  }),
});

module.exports = { createCategory, updateCategory, deleteCategory };