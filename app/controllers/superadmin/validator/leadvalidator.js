const Joi = require("joi");

const createLead = Joi.object().keys({
  leadCode: Joi.string().trim().required().messages({
    "string.empty": "Lead Code is required",
  }),
  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id id is required",
  }),
  name: Joi.string().trim().required().messages({
    "string.empty": "Name is required",
  }),
  number: Joi.string().trim().required().messages({
    "string.empty": "Number is required",
  }),
  email: Joi.string().trim().email({ tlds: false }).allow("", null),
  address: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  model: Joi.string().trim().required().messages({
    "string.empty": "Model is required",
  }),
  remark: Joi.string().trim().allow("", null),
  nextFollowupDate: Joi.string().trim().required().messages({
    "string.empty": "Next Followup Date is required",
  }),
  createdBy: Joi.number().required().messages({
    "number.base": "Created By is required",
  }),
  createdType: Joi.string().trim().required().messages({
    "string.empty": "Created Type is required",
  }),
});

const updateLead = createLead.keys({
  financialYearId: Joi.number().optional(),
  createdBy: Joi.number().optional(),
  createdType: Joi.string().trim().optional(),

  leadId: Joi.number().required().messages({
    "number.base": "Lead id is required",
  }),
});

const deleteLead = Joi.object().keys({
  leadId: Joi.number().required().messages({
    "number.base": "Lead id is required",
  }),
});

module.exports = { createLead, updateLead, deleteLead };