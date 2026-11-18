const Joi = require("joi");

const createSubGroup = Joi.object().keys({
  subGroupName: Joi.string().trim().required().messages({
    "string.empty": "Sub Group name is required",
    "any.required": "Sub Group name is required",
  }),
  itemCategoryId: Joi.number().required().messages({
    "number.base": "Item Category is required",
    "any.required": "Item Category is required",
  }),
  groupId: Joi.number().required().messages({
    "number.base": "Group is required",
    "any.required": "Group is required",
  }),
  parentSubGroupId: Joi.number().allow(null, ""),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
  createdBy: Joi.number().allow(null, ""),
  createdType: Joi.string().trim().allow(null, ""),
});

const updateSubGroup = Joi.object().keys({
  subGroupId: Joi.number().required().messages({
    "number.base": "Sub Group id is required",
    "any.required": "Sub Group id is required",
  }),
  subGroupName: Joi.string().trim().required().messages({
    "string.empty": "Sub Group name is required",
    "any.required": "Sub Group name is required",
  }),
  itemCategoryId: Joi.number().required().messages({
    "number.base": "Item Category is required",
    "any.required": "Item Category is required",
  }),
  groupId: Joi.number().required().messages({
    "number.base": "Group is required",
    "any.required": "Group is required",
  }),
  parentSubGroupId: Joi.number().allow(null, ""),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteSubGroup = Joi.object().keys({
  subGroupId: Joi.number().required().messages({
    "number.base": "Sub Group id is required",
  }),
});

module.exports = { createSubGroup, updateSubGroup, deleteSubGroup };