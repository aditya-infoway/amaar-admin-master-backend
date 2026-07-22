const Joi = require("joi");

const departmentValues = ["sale", "production", "security"];

const createEmployee = Joi.object().keys({
  department: Joi.string().valid(...departmentValues).required().messages({
    "any.only": "Please select a valid department",
    "string.empty": "Department is required",
  }),
  branch: Joi.string().trim().required().messages({
    "string.empty": "Branch is required",
  }),
  roleId: Joi.number().required().messages({
    "number.base": "Please select a role",
    "any.required": "Please select a role",
  }),
  employeeName: Joi.string().trim().required().messages({
    "string.empty": "Employee name is required",
  }),
  mobileNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
    "string.empty": "Mobile number is required",
    "string.pattern.base": "Mobile number must be 10 digits",
  }),
  alternateNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).allow("", null).messages({
    "string.pattern.base": "Alternate number must be 10 digits",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email",
  }),
  password: Joi.string().trim().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),
});

const updateEmployee = Joi.object().keys({
  employeeId: Joi.number().required().messages({
    "number.base": "Employee id is required",
  }),
  department: Joi.string().valid(...departmentValues).required().messages({
    "any.only": "Please select a valid department",
    "string.empty": "Department is required",
  }),
  branch: Joi.string().trim().required().messages({
    "string.empty": "Branch is required",
  }),
  roleId: Joi.number().required().messages({
    "number.base": "Please select a role",
    "any.required": "Please select a role",
  }),
  employeeName: Joi.string().trim().required().messages({
    "string.empty": "Employee name is required",
  }),
  mobileNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
    "string.empty": "Mobile number is required",
    "string.pattern.base": "Mobile number must be 10 digits",
  }),
  alternateNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).allow("", null).messages({
    "string.pattern.base": "Alternate number must be 10 digits",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email",
  }),
  // update me password optional — blank bhejo to purana password rahega
  password: Joi.string().trim().min(6).allow("", null),
});

const deleteEmployee = Joi.object().keys({
  employeeId: Joi.number().required().messages({
    "number.base": "Employee id is required",
  }),
});

module.exports = { createEmployee, updateEmployee, deleteEmployee };