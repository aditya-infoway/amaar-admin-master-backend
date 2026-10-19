const Joi = require("joi");

const validateItemCategoryStage = Joi.object().keys({
  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),

  processId: Joi.number().integer().required().messages({
    "number.base": "Please select a stage",
    "any.required": "Please select a stage",
  }),

  // frontend process name bhejta hai, lekin backend DB se khud nikalta hai
  stage: Joi.string().allow(null, "").optional(),

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