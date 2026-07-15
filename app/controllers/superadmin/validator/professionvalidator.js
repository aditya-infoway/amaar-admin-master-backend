const Joi = require("joi");

const createProfession = Joi.object().keys({
  professionName: Joi.string().trim().required().messages({
    "string.empty": "Profession name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateProfession = Joi.object().keys({
  professionId: Joi.number().required().messages({
    "number.base": "Profession id is required",
  }),
  professionName: Joi.string().trim().required().messages({
    "string.empty": "Profession name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteProfession = Joi.object().keys({
  professionId: Joi.number().required().messages({
    "number.base": "Profession id is required",
  }),
});

module.exports = { createProfession, updateProfession, deleteProfession };