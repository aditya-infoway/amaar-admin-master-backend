const Joi = require("joi");

// Item code fields: Auto me prefix + serialNo required, Manual me kuch nahi chahiye
const itemCodeFields = {
  itemCodeType: Joi.string().valid("manual", "auto").default("manual").messages({
    "any.only": "Item code type must be either manual or auto",
  }),
  prefix: Joi.when("itemCodeType", {
    is: "auto",
    then: Joi.string().trim().max(20).required().messages({
      "string.empty": "Prefix is required for auto item code",
      "any.required": "Prefix is required for auto item code",
    }),
    otherwise: Joi.string().allow("", null),
  }),
  suffix: Joi.string().trim().max(20).allow("", null),
  serialNo: Joi.when("itemCodeType", {
    is: "auto",
    then: Joi.string().trim().max(20).pattern(/^\d+$/).required().messages({
      "string.empty": "Serial No. is required for auto item code",
      "any.required": "Serial No. is required for auto item code",
      "string.pattern.base": "Serial No. must contain numbers only",
    }),
    otherwise: Joi.string().allow("", null),
  }),
};

const createItemCategory = Joi.object().keys({
  categoryName: Joi.string().trim().required().messages({
    "string.empty": "Item Category name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
  createdBy: Joi.number().allow(null, ""),
  createdType: Joi.string().trim().allow(null, ""),
  ...itemCodeFields,
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
  ...itemCodeFields,
});

const deleteItemCategory = Joi.object().keys({
  itemCategoryId: Joi.number().required().messages({
    "number.base": "Item Category id is required",
  }),
});

module.exports = { createItemCategory, updateItemCategory, deleteItemCategory };