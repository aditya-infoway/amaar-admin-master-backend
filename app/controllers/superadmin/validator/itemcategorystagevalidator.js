const Joi = require("joi");

const validateItemCategoryStage = Joi.object().keys({
      financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),
    stage: Joi.string().valid("cutting").required().messages({
    "string.base": "Please select a stage",
    "any.only": "Invalid stage selected",
    "any.required": "Please select a stage",
  }),

  categoryId: Joi.number().integer().required().messages({
    "number.base": "Please select an item category",
    "any.required": "Please select an item category",
  }),

  createdBy: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .allow(null, ""),

  createdType: Joi.string().allow(null, ""),
});

module.exports = { validateItemCategoryStage };