const Joi = require("joi");

const createEnquirySource = Joi.object().keys({
  sourceName: Joi.string().trim().required().messages({
    "string.empty": "Source name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateEnquirySource = Joi.object().keys({
  enquirySourceId: Joi.number().required().messages({
    "number.base": "Enquiry source id is required",
  }),
  sourceName: Joi.string().trim().required().messages({
    "string.empty": "Source name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteEnquirySource = Joi.object().keys({
  enquirySourceId: Joi.number().required().messages({
    "number.base": "Enquiry source id is required",
  }),
});

module.exports = { createEnquirySource, updateEnquirySource, deleteEnquirySource };