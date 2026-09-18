// controllers/superadmin/validator/grrvalidator.js
const Joi = require("joi");

const createGrr = Joi.object().keys({
  financialYearId: Joi.number().required().messages({ "any.required": "financial Year Id is required" }),
  purchaseOrderId: Joi.number().required().messages({ "any.required": "Purchase order is required" }),
  grrDate: Joi.string().required().messages({ "any.required": "GRR date is required" }),
  remarks: Joi.string().allow("", null),

  items: Joi.array().min(1).items(
    Joi.object({
      purchaseOrderDetailsId: Joi.number().required().messages({
        "any.required": "Purchase order item reference is required",
      }),
      itemName: Joi.string().allow("", null),
      inQty: Joi.number().min(0).required().messages({ "any.required": "In Qty is required" }),
    })
  ).required().messages({ "array.min": "Please add at least one item." }),
});

module.exports = { createGrr };