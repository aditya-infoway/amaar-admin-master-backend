// controllers/superadmin/validator/bodyRegisterValidator.js

const Joi = require("joi");

const createBodyRegister = Joi.object().keys({
  workOrderId: Joi.number().integer().positive().required().messages({
    "number.base": "Work Order is required",
    "number.integer": "Work Order is required",
    "number.positive": "Work Order is required",
    "any.required": "Work Order is required",
  }),

  companyDetailsId: Joi.number().integer().positive().required().messages({
    "number.base": "Company Details is required",
    "number.integer": "Company Details is required",
    "number.positive": "Company Details is required",
    "any.required": "Company Details is required",
  }),

  vehicleType: Joi.string().trim().allow("", null),
  classOfVehicle: Joi.string().trim().allow("", null),
  typeOfBody: Joi.string().trim().allow("", null),

  engineNo: Joi.string().trim().required().messages({
    "string.empty": "Engine No is required",
    "any.required": "Engine No is required",
  }),

  noOfCylinder: Joi.string().trim().required().messages({
    "string.empty": "No. of Cylinder is required",
    "any.required": "No. of Cylinder is required",
  }),

  fuelUsed: Joi.string().trim().required().messages({
    "string.empty": "Fuel Used is required",
    "any.required": "Fuel Used is required",
  }),

  bodyColour: Joi.string().trim().required().messages({
    "string.empty": "Body Colour is required",
    "any.required": "Body Colour is required",
  }),

  grossVehicleWeight: Joi.string().trim().required().messages({
    "string.empty": "Gross Vehicle Weight is required",
    "any.required": "Gross Vehicle Weight is required",
  }),
});

module.exports = {
  createBodyRegister,
};