const Joi = require("joi");

const optionalString = Joi.string().trim().allow("", null);

const companyDetailsSchema = Joi.object({
  // Company Information
  companyName: Joi.string().trim().required().messages({
    "string.empty": "Company name is required",
    "any.required": "Company name is required",
  }),
  natureOfBusiness: Joi.string().trim().required().messages({
    "string.empty": "Nature of business is required",
    "any.required": "Nature of business is required",
  }),
  taxSystem: Joi.string().trim().required().messages({
    "any.required": "Please select tax system",
  }),

  // Basic Details
  addressLine1: Joi.string().trim().required().messages({
    "string.empty": "Address line 1 is required",
    "any.required": "Address line 1 is required",
  }),
  addressLine2: optionalString,
  city: Joi.string().trim().required().messages({
    "string.empty": "City is required",
  }),
  pinCode: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.pattern.base": "Enter a valid 6-digit pin code",
      "string.empty": "Pin code is required",
    }),
  country: Joi.string().trim().required().messages({
    "any.required": "Please select country",
  }),
  state: Joi.string().trim().required().messages({
    "any.required": "Please select state",
  }),
  stateCode: Joi.string().trim().required().messages({
    "string.empty": "State code is required",
  }),
  district: Joi.string().trim().required().messages({
    "any.required": "Please select district",
  }),
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Enter a valid 10-digit mobile number",
      "string.empty": "Mobile is required",
    }),
  phone: optionalString,
  email: Joi.string().trim().email({ tlds: false }).required().messages({
    "string.email": "Enter a valid email",
    "string.empty": "Email is required",
  }),
  website: optionalString,
  dateFormat: Joi.string().trim().required().messages({
    "any.required": "Please select date format",
  }),

  // Registration Details
  gstNo: optionalString,
  vatNo: optionalString,
  panNo: optionalString,
  tanNo: optionalString,

  // Licensing
  dlNo1: optionalString,
  dlNo2: optionalString,
  dealsIn: optionalString,

  // Bank Details (all optional, format validated if present)
  bankHolderName: optionalString,
  bankAccountNo: Joi.string()
    .trim()
    .pattern(/^\d{9,18}$/)
    .allow("", null)
    .messages({ "string.pattern.base": "Enter a valid bank account number" }),
  branchName: optionalString,
  ifscCode: Joi.string()
    .trim()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .allow("", null)
    .messages({ "string.pattern.base": "Enter a valid IFSC code" }),

  // Financial Year (nested)
  financialYear: Joi.object({
    startDate: Joi.date().iso().required().messages({
      "any.required": "Start date is required",
      "date.base": "Start date is required",
    }),
    endDate: Joi.date().iso().required().messages({
      "any.required": "End date is required",
      "date.base": "End date is required",
    }),
  })
    .required()
    .custom((value, helpers) => {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);

      if (start.getMonth() !== 3 || start.getDate() !== 1) {
        return helpers.message("Start date must always be 1st April");
      }
      if (end.getMonth() !== 2 || end.getDate() !== 31) {
        return helpers.message("End date must always be 31st March");
      }
      if (end.getFullYear() !== start.getFullYear() + 1) {
        return helpers.message("End year must be exactly one year after start year");
      }
      return value;
    }),
});

const companyDetailsUpdateSchema = Joi.object({
  companyDetailsId: Joi.string().required().messages({
    "any.required": "companyDetailsId is required",
  }),

  companyName: Joi.string().trim().required().messages({
    "string.empty": "Company name is required",
  }),
  natureOfBusiness: Joi.string().trim().required(),
  taxSystem: Joi.string().trim().required(),

  addressLine1: Joi.string().trim().required(),
  addressLine2: optionalString,
  city: Joi.string().trim().required(),
  pinCode: Joi.string().trim().pattern(/^\d{6}$/).required().messages({
    "string.pattern.base": "Enter a valid 6-digit pin code",
  }),
  country: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  stateCode: Joi.string().trim().required(),
  district: Joi.string().trim().required(),
  mobile: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
    "string.pattern.base": "Enter a valid 10-digit mobile number",
  }),
  phone: optionalString,
  email: Joi.string().trim().email({ tlds: false }).required(),
  website: optionalString,
  dateFormat: Joi.string().trim().required(),

  gstNo: optionalString,
  vatNo: optionalString,
  panNo: optionalString,
  tanNo: optionalString,

  dlNo1: optionalString,
  dlNo2: optionalString,
  dealsIn: optionalString,

  bankHolderName: optionalString,
  bankAccountNo: Joi.string().trim().pattern(/^\d{9,18}$/).allow("", null).messages({
    "string.pattern.base": "Enter a valid bank account number",
  }),
  branchName: optionalString,
  ifscCode: Joi.string().trim().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow("", null).messages({
    "string.pattern.base": "Enter a valid IFSC code",
  }),
});

module.exports = {
  companyDetailsSchema,
  companyDetailsUpdateSchema,
};