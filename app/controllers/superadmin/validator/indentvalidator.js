const Joi = require("joi");

const validateIndent = Joi.object().keys({
  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),

  workOrderId: Joi.number().required().messages({
    "number.base": "Please select a Work Order",
    "any.required": "Please select a Work Order",
  }),

  modelItemId: Joi.number().allow(null),

  modelName: Joi.string().trim().allow("", null),

  items: Joi.array()
    .items(
      Joi.object({
        bomItemId: Joi.number().allow(null),
        itemId: Joi.number().allow(null),
        itemCode: Joi.string().trim().allow("", null),
        itemName: Joi.string().trim().allow("", null),
        itemLocation: Joi.string().trim().allow("", null),
        category: Joi.string().trim().allow("", null),
        unit: Joi.string().trim().allow("", null),

        availableStock: Joi.number().min(0).required().messages({
          "number.base": "Available stock must be a number",
          "any.required": "Available stock is required",
        }),

        requiredStock: Joi.number().min(0).required().messages({
          "number.base": "Required stock must be a number",
          "any.required": "Required stock is required",
        }),

        purchaseRequired: Joi.number().min(0).required().messages({
          "number.base": "Purchase required must be a number",
          "any.required": "Purchase required is required",
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "Please add at least one item.",
      "any.required": "Items are required.",
    }),
});

module.exports = { validateIndent };