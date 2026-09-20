
const Joi = require("joi");

// ============================================================
// SALES ORDER CREATE / UPDATE VALIDATION
// ============================================================

const validateSalesOrder = Joi.object().keys({
  // ==========================================================
  // FINANCIAL YEAR
  // ==========================================================

  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),

  // ==========================================================
  // QUOTATION
  // ==========================================================

  quotationId: Joi.number().required().messages({
    "number.base": "Please select a quotation",
    "any.required": "Please select a quotation",
  }),

  leadId: Joi.number().required().messages({
    "number.base": "Please select a lead",
    "any.required": "Please select a lead",
  }),

  // ==========================================================
  // MODE
  // ==========================================================

  mode: Joi.string()
    .valid("asIs", "manual")
    .required()
    .messages({
      "any.only": "Mode must be either As Its or Manual",
      "any.required": "Sales Order mode is required",
    }),

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

  // ==========================================================
  // QUANTITY / AMOUNT
  // ==========================================================

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

  // ==========================================================
  // KYC
  // ==========================================================

  aadharNumber: Joi.string().trim().allow("", null),

  panNumber: Joi.string().trim().allow("", null),

  gstNumber: Joi.string().trim().allow("", null),

  // ==========================================================
  // CREATED BY
  // ==========================================================

  createdBy: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .allow(null, ""),

  createdType: Joi.string().allow(null, ""),
});

module.exports = {
  validateSalesOrder,
};
