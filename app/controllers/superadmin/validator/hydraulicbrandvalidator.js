const Joi = require("joi");

const createHydraulicBrand = Joi.object().keys({
  hydraulicBrandName: Joi.string().trim().required().messages({
    "string.empty": "Hydraulic brand name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateHydraulicBrand = Joi.object().keys({
  hydraulicBrandId: Joi.number().required().messages({
    "number.base": "Hydraulic brand id is required",
  }),
  hydraulicBrandName: Joi.string().trim().required().messages({
    "string.empty": "Hydraulic brand name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteHydraulicBrand = Joi.object().keys({
  hydraulicBrandId: Joi.number().required().messages({
    "number.base": "Hydraulic brand id is required",
  }),
});

module.exports = { createHydraulicBrand, updateHydraulicBrand, deleteHydraulicBrand };