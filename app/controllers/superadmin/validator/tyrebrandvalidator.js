const Joi = require("joi");

const createTyreBrand = Joi.object().keys({
  tyreBrandName: Joi.string().trim().required().messages({
    "string.empty": "Tyre brand name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateTyreBrand = Joi.object().keys({
  tyreBrandId: Joi.number().required().messages({
    "number.base": "Tyre brand id is required",
  }),
  tyreBrandName: Joi.string().trim().required().messages({
    "string.empty": "Tyre brand name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteTyreBrand = Joi.object().keys({
  tyreBrandId: Joi.number().required().messages({
    "number.base": "Tyre brand id is required",
  }),
});

module.exports = { createTyreBrand, updateTyreBrand, deleteTyreBrand };