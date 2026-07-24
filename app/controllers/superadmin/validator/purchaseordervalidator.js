const Joi = require("joi");

const createPurchaseOrder = Joi.object().keys({
  financialYearId: Joi.number().required().messages({ "any.required": "financial Year Id is required" }),
  poNumber: Joi.string().required(),
  poDate: Joi.string().required(),
  requiredDate: Joi.string().allow("", null),
  branchId: Joi.number().allow(null, ""),
  narration: Joi.string().allow("", null),
  discountAmount: Joi.number().min(0).allow(null, "").default(0),
  roundAmount: Joi.number().allow(null, "").default(0),
  status: Joi.string().valid("Draft", "Generated").required(),

  items: Joi.array().min(1).items(
    Joi.object({
      itemId: Joi.number().required().messages({ "any.required": "Item id is required" }),
      supplierId: Joi.number().allow(null, ""),
      itemCode: Joi.string().allow("", null),
      itemName: Joi.string().required(),
      hsnCode: Joi.string().allow("", null),
      uom: Joi.string().allow("", null),
      qty: Joi.number().greater(0).required().messages({ "number.greater": "Qty must be greater than 0" }),
      rate: Joi.number().min(0).required(),
      discount: Joi.number().min(0).max(100).allow(null, "").default(0),
      gstPct: Joi.number().min(0).required(),
    })
  ).required().messages({ "array.min": "Please add at least one item." }),
});

module.exports = { createPurchaseOrder };