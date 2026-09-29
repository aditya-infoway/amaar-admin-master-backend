
const Joi = require("joi");

// ============================================================
// SALES ORDER CREATE / UPDATE VALIDATION
// ============================================================

const validateSalesOrder = Joi.object().keys({
  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),

  quotationId: Joi.number().required().messages({
    "number.base": "Please select a quotation",
    "any.required": "Please select a quotation",
  }),

  leadId: Joi.number().required().messages({
    "number.base": "Please select a lead",
    "any.required": "Please select a lead",
  }),

  // ==========================================================
  // PARTY (ACCOUNT) — aadhar/pan/gst uske account record se aayega
  // ==========================================================

  accountId: Joi.number().integer().allow(null, "").optional(),

  // ==========================================================
  // SALES ORDER CUSTOMER DETAILS
  // ==========================================================

  customerName: Joi.any().optional(),
  mobile: Joi.any().optional(),
  email: Joi.any().optional(),
  address: Joi.any().optional(),
  city: Joi.any().optional(),
  model: Joi.any().optional(),
  remark: Joi.any().optional(),

  qty: Joi.number().positive().required().messages({
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be greater than 0",
    "any.required": "Quantity is required",
  }),

  unitPrice: Joi.number().min(0).required().messages({
    "number.base": "Amount must be a number",
    "number.min": "Amount cannot be negative",
    "any.required": "Amount is required",
  }),

  totalAmount: Joi.number().min(0).required().messages({
    "number.base": "Total amount must be a number",
    "number.min": "Total amount cannot be negative",
    "any.required": "Total amount is required",
  }),

  createdBy: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .allow(null, ""),

  createdType: Joi.string().allow(null, ""),
});
module.exports = {
  validateSalesOrder,
};
