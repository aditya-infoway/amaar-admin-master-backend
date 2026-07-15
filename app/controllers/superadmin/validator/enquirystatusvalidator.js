const Joi = require("joi");

const createEnquiryStatus = Joi.object().keys({
  statusName: Joi.string().trim().required().messages({
    "string.empty": "Enquiry status name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateEnquiryStatus = Joi.object().keys({
  enquiryStatusId: Joi.number().required().messages({
    "number.base": "Enquiry status id is required",
  }),
  statusName: Joi.string().trim().required().messages({
    "string.empty": "Enquiry status name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteEnquiryStatus = Joi.object().keys({
  enquiryStatusId: Joi.number().required().messages({
    "number.base": "Enquiry status id is required",
  }),
});

module.exports = { createEnquiryStatus, updateEnquiryStatus, deleteEnquiryStatus };