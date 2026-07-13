const Joi = require("joi");

const mobilePattern = /^[6-9]\d{9}$/;
const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const aadhaarPattern = /^[2-9][0-9]{11}$/;

const createCompany = Joi.object().keys({
  // ---- Company Information ----
  companyName: Joi.string().trim().required().messages({
    "string.empty": "Company name is required",
  }),
  companyAddress: Joi.string().trim().required().messages({
    "string.empty": "Company address is required",
  }),
  contactNumber: Joi.string().trim().pattern(mobilePattern).required().messages({
    "string.empty": "Contact number is required",
    "string.pattern.base": "Enter a valid 10-digit mobile number",
  }),
  businessEmail: Joi.string().trim().pattern(gmailPattern).required().messages({
    "string.empty": "Business Gmail is required",
    "string.pattern.base": "Enter a valid Gmail address",
  }),
  ownerName: Joi.string().trim().required().messages({
    "string.empty": "Owner name is required",
  }),
  ownerContactNumber: Joi.string().trim().pattern(mobilePattern).required().messages({
    "string.empty": "Owner contact number is required",
    "string.pattern.base": "Enter a valid 10-digit mobile number",
  }),
  ownerEmail: Joi.string().trim().email().required().messages({
    "string.empty": "Owner email is required",
    "string.email": "Enter a valid email address",
  }),
  country: Joi.string().trim().required().messages({
    "string.empty": "Please select a country",
  }),
  state: Joi.string().trim().required().messages({
    "string.empty": "Please select a state",
  }),
  district: Joi.string().trim().required().messages({
    "string.empty": "Please select a district",
  }),
  taluka: Joi.string().trim().required().messages({
    "string.empty": "Please select a taluka",
  }),

  // ---- Business Information ----
  registrationDate: Joi.date().required().messages({
    "date.base": "Registration date is required",
  }),
  expiryDate: Joi.date().min(Joi.ref("registrationDate")).required().messages({
    "date.base": "Expiry date is required",
    "date.min": "Expiry date must be after registration date",
  }),
  businessType: Joi.string().trim().required().messages({
    "string.empty": "Please select a business type",
  }),
  employeeSize: Joi.string().trim().required().messages({
    "string.empty": "Please select employee size",
  }),
  gstNumber: Joi.string().trim().pattern(gstPattern).required().messages({
    "string.empty": "GST number is required",
    "string.pattern.base": "Enter a valid GST number",
  }),
  panNumber: Joi.string().trim().pattern(panPattern).required().messages({
    "string.empty": "PAN card number is required",
    "string.pattern.base": "Enter a valid PAN card number",
  }),
  aadhaarNumber: Joi.string().trim().pattern(aadhaarPattern).required().messages({
    "string.empty": "Aadhaar number is required",
    "string.pattern.base": "Enter a valid 12-digit Aadhaar number",
  }),

  // ---- Login Information ----
  companyEmail: Joi.string().trim().email().required().messages({
    "string.empty": "Company email is required",
    "string.email": "Enter a valid email address",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match",
    "string.empty": "Confirm password is required",
  }),
});

const loginCompany = Joi.object().keys({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  createCompany,
  loginCompany,
};