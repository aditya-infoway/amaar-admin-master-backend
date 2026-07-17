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

const gstRule = Joi.string().trim().uppercase()
  .pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/)
  .allow("", null)
  .messages({ "string.pattern.base": "Please enter a valid GST number" });

const phoneRule = Joi.string().trim()
  .pattern(/^[0-9]{6,15}$/)
  .allow("", null)
  .messages({ "string.pattern.base": "Please enter a valid phone number" });

const mobileRule = Joi.string().trim()
  .pattern(/^[6-9][0-9]{9}$/)
  .required()
  .messages({
    "string.empty": "Mobile number is required",
    "string.pattern.base": "Please enter a valid 10-digit mobile number",
    "any.required": "Mobile number is required",
  });

const ifscRule = Joi.string().trim().uppercase()
  .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  .allow("", null)
  .messages({ "string.pattern.base": "Please enter a valid IFSC code" });

const baseSchema = {
  accountName: Joi.string().trim().required().messages({
    "string.empty": "Account Name is required",
  }),
  printName: Joi.string().trim().allow("", null),
  groupId: Joi.number().required().messages({
    "any.required": "Group is required",
    "number.base": "Group is required",
  }),
  drOrCr: Joi.string().valid("DR", "CR").required().messages({
    "any.only": "Dr./Cr. must be either DR or CR",
    "string.empty": "Dr./Cr. is required",
  }),
  openingBalance: Joi.number().allow(null).default(0),

  // countryId / stateId / stateCode HATA DIYE — sirf naam store hota hai
  countryName: Joi.string().trim().required().messages({
    "string.empty": "Country is required",
  }),
  stateName: Joi.string().trim().required().messages({
    "string.empty": "State is required",
  }),
  stateCode: Joi.string().trim().allow("", null),

  districtName: Joi.string().trim().required().messages({ "string.empty": "District is required" }),
  talukaName: Joi.string().trim().required().messages({ "string.empty": "Taluka is required" }),
  cityName: Joi.string().trim().required().messages({ "string.empty": "City is required" }),

  area: Joi.string().trim().required().messages({ "string.empty": "Area is required" }),
  addressLine1: Joi.string().trim().required().messages({ "string.empty": "Address Line 1 is required" }),
  addressLine2: Joi.string().trim().allow("", null),
  pincode: Joi.string().trim().pattern(/^[0-9]{6}$/).required().messages({
    "string.empty": "Pincode is required",
    "string.pattern.base": "Pincode must be 6 digits",
  }),

  phoneNo: phoneRule,
  mobileNo: mobileRule,
  email: emailRule,
  contactPersonName: Joi.string().trim().allow("", null),

  birthdayOn: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Birthday must be in YYYY-MM-DD format",
    }),
  anniversary: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Anniversary must be in YYYY-MM-DD format",
    }),

  bankAccountNo: Joi.string().trim().allow("", null),
  bankName: Joi.string().trim().allow("", null),
  ifscCode: ifscRule,
  branchName: Joi.string().trim().allow("", null),

  gstNo: gstRule,
  panCard: panRule,
  aadharCardNo: aadharRule,

  status: Joi.string().valid("active", "inactive").default("active"),
  financialYearId: Joi.number().required().messages({
    "any.required": "Financial year is required",
  }),
};

const createAccount = Joi.object().keys(baseSchema);

const updateAccount = Joi.object().keys({
  ...baseSchema,
  accountId: Joi.number().required().messages({
    "any.required": "Account id is required",
  }),
});

const deleteAccount = Joi.object().keys({
  accountId: Joi.number().required().messages({
    "any.required": "Account id is required",
  }),
});

module.exports = { createAccount, updateAccount, deleteAccount };