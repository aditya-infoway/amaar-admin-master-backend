const Joi = require("joi");

const createItemCategory = Joi.object().keys({
  categoryName: Joi.string().trim().required().messages({
    "string.empty": "Item Category name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateItemCategory = Joi.object().keys({
  itemCategoryId: Joi.number().required().messages({
    "number.base": "Item Category id is required",
  }),
  categoryName: Joi.string().trim().required().messages({
    "string.empty": "Item Category name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteItemCategory = Joi.object().keys({
  itemCategoryId: Joi.number().required().messages({
    "number.base": "Item Category id is required",
  }),
});

module.exports = { createItemCategory, updateItemCategory, deleteItemCategory };