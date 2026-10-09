const Joi = require("joi");

// ============================================================
// SALES (REGISTER) CREATE / UPDATE VALIDATION
// ============================================================
// Amounts frontend se aate hain, lekin controller unhe dubara calculate
// karta hai — yahan sirf shape / required checks hain.

const nullableId = Joi.number().integer().allow(null, "");

const itemSchema = Joi.object().keys({
  itemId: Joi.number().integer().positive().required().messages({
    "number.base": "Item reference is required",
    "any.required": "Item reference is required",
  }),
  itemCode: Joi.any().optional(),
  itemDescription: Joi.any().optional(),
  hsnCode: Joi.any().optional(),
  uom: Joi.any().optional(),

  qty: Joi.number().positive().required().messages({
    "number.base": "Item quantity must be a number",
    "number.positive": "Item quantity must be greater than 0",
    "any.required": "Item quantity is required",
  }),

  basicPrice: Joi.number().min(0).required().messages({
    "number.base": "Basic price must be a number",
    "number.min": "Basic price cannot be negative",
    "any.required": "Basic price is required",
  }),

  discount: Joi.number().min(0).allow(null, "").default(0),
  taxPct: Joi.number().min(0).max(100).allow(null, "").default(0),

  // server dobara calculate karega — optional
  amount: Joi.number().optional(),
  taxableAmount: Joi.number().optional(),
  taxAmount: Joi.number().optional(),
  netAmount: Joi.number().optional(),
});

const validateSales = Joi.object().keys({
  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),

  terms: Joi.string().valid("Credit", "Cash", "Bank").required().messages({
    "any.only": "Terms must be Credit, Cash or Bank",
    "any.required": "Terms is required",
  }),

  salesOrderId: nullableId.optional(),

  accountId: Joi.number().integer().positive().required().messages({
    "number.base": "Please select a party",
    "any.required": "Please select a party",
  }),

  salesInvoiceNo: Joi.string().trim().required().messages({
    "string.empty": "Sales Invoice No is required",
    "any.required": "Sales Invoice No is required",
  }),

  salesDate: Joi.string().required().messages({
    "string.empty": "Sales Date is required",
    "any.required": "Sales Date is required",
  }),

  branchId: nullableId.optional(),

  dueDate: Joi.when("terms", {
    is: "Credit",
    then: Joi.string().required().messages({
      "string.empty": "Due Date is required for Credit terms",
      "any.required": "Due Date is required for Credit terms",
    }),
    otherwise: Joi.any().allow(null, "").optional(),
  }),

  narration: Joi.string().allow(null, "").optional(),

  // ---- totals (server recalculates; sirf IGST/CGST decision use hota hai) ----
  subTotal: Joi.number().optional(),
  taxableAmount: Joi.number().optional(),
  discountAmount: Joi.number().optional(),
  cgstAmount: Joi.number().optional(),
  sgstAmount: Joi.number().optional(),
  igstAmount: Joi.number().optional(),
  grandTotal: Joi.number().optional(),

  // ---- payment ----
  cashAccountId: Joi.when("terms", {
    is: "Cash",
    then: Joi.number().integer().required().messages({
      "number.base": "Please select a Cash Account",
      "any.required": "Please select a Cash Account",
    }),
    otherwise: Joi.any().allow(null, "").optional(),
  }),

  bankAccountId: Joi.when("terms", {
    is: "Bank",
    then: Joi.number().integer().required().messages({
      "number.base": "Please select a Bank Account",
      "any.required": "Please select a Bank Account",
    }),
    otherwise: Joi.any().allow(null, "").optional(),
  }),

  paymentMode: Joi.when("terms", {
    is: "Bank",
    then: Joi.string()
      .valid("UPI", "NEFT", "RTGS", "IMPS", "CHEQUE", "CARD")
      .required()
      .messages({
        "any.only": "Invalid payment mode",
        "any.required": "Payment mode is required for Bank terms",
      }),
    otherwise: Joi.any().allow(null, "").optional(),
  }),

  chequeNo: Joi.any().allow(null, "").optional(),
  chequeDate: Joi.any().allow(null, "").optional(),
  chequeClearDate: Joi.any().allow(null, "").optional(),
  bankNarration: Joi.any().allow(null, "").optional(),

  createdBy: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null, ""),
  createdType: Joi.string().allow(null, ""),

  items: Joi.array().items(itemSchema).min(1).required().messages({
    "array.min": "Please add at least one item",
    "any.required": "Please add at least one item",
  }),
});

module.exports = {
  validateSales,
};