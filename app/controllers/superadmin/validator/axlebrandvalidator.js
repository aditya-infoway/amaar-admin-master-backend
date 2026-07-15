const Joi = require("joi");

const createAxleBrand = Joi.object().keys({
  axleBrandName: Joi.string().trim().required().messages({
    "string.empty": "Axle brand name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateAxleBrand = Joi.object().keys({
  axleBrandId: Joi.number().required().messages({
    "number.base": "Axle brand id is required",
  }),
  axleBrandName: Joi.string().trim().required().messages({
    "string.empty": "Axle brand name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteAxleBrand = Joi.object().keys({
  axleBrandId: Joi.number().required().messages({
    "number.base": "Axle brand id is required",
  }),
});

module.exports = { createAxleBrand, updateAxleBrand, deleteAxleBrand };