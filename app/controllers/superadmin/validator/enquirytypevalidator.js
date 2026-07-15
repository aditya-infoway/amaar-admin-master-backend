const Joi = require("joi");

const createEnquiryType = Joi.object().keys({
  enquiryTypeName: Joi.string().trim().required().messages({
    "string.empty": "Enquiry type name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateEnquiryType = Joi.object().keys({
  enquiryTypeId: Joi.number().required().messages({
    "number.base": "Enquiry type id is required",
  }),
  enquiryTypeName: Joi.string().trim().required().messages({
    "string.empty": "Enquiry type name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteEnquiryType = Joi.object().keys({
  enquiryTypeId: Joi.number().required().messages({
    "number.base": "Enquiry type id is required",
  }),
});

module.exports = { createEnquiryType, updateEnquiryType, deleteEnquiryType };