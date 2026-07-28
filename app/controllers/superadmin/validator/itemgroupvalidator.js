const Joi = require("joi");

const createItemGroup = Joi.object().keys({
  groupName: Joi.string().trim().required().messages({
    "string.empty": "Item Group name is required",
  }),
  itemCategoryId: Joi.number().required().messages({
    "number.base": "Item Category is required",
    "any.required": "Item Category is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateItemGroup = Joi.object().keys({
  itemGroupId: Joi.number().required().messages({
    "number.base": "Item Group id is required",
  }),
  groupName: Joi.string().trim().required().messages({
    "string.empty": "Item Group name is required",
  }),
  itemCategoryId: Joi.number().required().messages({
    "number.base": "Item Category is required",
    "any.required": "Item Category is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteItemGroup = Joi.object().keys({
  itemGroupId: Joi.number().required().messages({
    "number.base": "Item Group id is required",
  }),
});

module.exports = { createItemGroup, updateItemGroup, deleteItemGroup };