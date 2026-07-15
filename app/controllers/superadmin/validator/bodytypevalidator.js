const Joi = require("joi");

const createBodyType = Joi.object().keys({
  bodyTypeName: Joi.string().trim().required().messages({
    "string.empty": "Body type name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateBodyType = Joi.object().keys({
  bodyTypeId: Joi.number().required().messages({
    "number.base": "Body type id is required",
  }),
  bodyTypeName: Joi.string().trim().required().messages({
    "string.empty": "Body type name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteBodyType = Joi.object().keys({
  bodyTypeId: Joi.number().required().messages({
    "number.base": "Body type id is required",
  }),
});

module.exports = { createBodyType, updateBodyType, deleteBodyType };