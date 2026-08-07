const Joi = require("joi");

const prefixCreateSchema = Joi.object({
  prefixFor: Joi.string().trim().uppercase().required().messages({
    "string.empty": "Prefix For is required",
    "any.required": "Prefix For is required",
  }),
  prefix: Joi.string().trim().uppercase().max(20).required().messages({
    "string.empty": "Prefix is required",
    "any.required": "Prefix is required",
  }),
});

const prefixUpdateSchema = Joi.object({
  prefixId: Joi.number().required().messages({
    "any.required": "prefixId is required",
  }),
  prefixFor: Joi.string().trim().uppercase().required().messages({
    "string.empty": "Prefix For is required",
  }),
  prefix: Joi.string().trim().uppercase().max(20).required().messages({
    "string.empty": "Prefix is required",
  }),
});

module.exports = { prefixCreateSchema, prefixUpdateSchema };