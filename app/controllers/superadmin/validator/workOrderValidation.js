const Joi = require("joi");

const validateWorkOrder = Joi.object().keys({
  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),

  workOrderNo: Joi.string().trim().allow("", null),

  salesOrderId: Joi.number().required().messages({
    "number.base": "Please select a Sales Order",
    "any.required": "Please select a Sales Order",
  }),

  customerName: Joi.string().trim().required().messages({
    "string.empty": "Customer name is required",
    "any.required": "Customer name is required",
  }),

  mobile: Joi.string().trim().required().messages({
    "string.empty": "Client number is required",
    "any.required": "Client number is required",
  }),

  email: Joi.string().trim().email().allow("", null).messages({
    "string.email": "Enter a valid email",
  }),

  address: Joi.string().trim().allow("", null),

  city: Joi.string().trim().allow("", null),

  model: Joi.string().trim().allow("", null),

  qty: Joi.number().positive().required().messages({
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be greater than 0",
    "any.required": "Quantity is required",
  }),

  totalPrice: Joi.number().min(0).required().messages({
    "number.base": "Total Price must be a number",
    "number.min": "Total Price cannot be negative",
    "any.required": "Total Price is required",
  }),

  gst: Joi.number().min(0).required().messages({
    "number.base": "GST must be a number",
    "number.min": "GST cannot be negative",
    "any.required": "GST is required",
  }),

  grandTotal: Joi.number().min(0).required().messages({
    "number.base": "Grand Total must be a number",
    "number.min": "Grand Total cannot be negative",
    "any.required": "Grand Total is required",
  }),

  createdBy: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .allow(null, ""),

  createdType: Joi.string().allow(null, ""),
});

module.exports = { validateWorkOrder };