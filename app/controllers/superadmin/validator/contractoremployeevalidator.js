const Joi = require("joi");

const emailRule = Joi.string().trim().email({ tlds: { allow: false } }).allow("", null).messages({
  "string.email": "Please enter a valid email address",
});

const panRule = Joi.string().trim().uppercase()
  .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
  .allow("", null)
  .messages({ "string.pattern.base": "Please enter a valid PAN number (e.g. ABCDE1234F)" });

const aadharRule = Joi.string().trim()
  .pattern(/^\d{12}$/)
  .allow("", null)
  .messages({ "string.pattern.base": "Aadhar number must be exactly 12 digits" });

// Body arrives as multipart/form-data (Aadhar/PAN images), so every value is a string.
const baseSchema = {
  partyId: Joi.number().integer().positive().required().messages({
    "any.required": "Party is required",
    "number.base": "Party is required",
    "number.positive": "Party is required",
  }),
  employeeName: Joi.string().trim().required().messages({
    "string.empty": "Employee Name is required",
    "any.required": "Employee Name is required",
  }),
  employeeNo: Joi.string().trim().required().messages({
    "string.empty": "Employee Number is required",
    "any.required": "Employee Number is required",
  }),
  email: emailRule,
  address: Joi.string().trim().allow("", null),
  aadharNumber: aadharRule,
  panNumber: panRule,
};

const createContractorEmployee = Joi.object().keys(baseSchema);

// The id comes from the URL (/:id), not the body
const updateContractorEmployee = Joi.object().keys(baseSchema);

module.exports = { createContractorEmployee, updateContractorEmployee };