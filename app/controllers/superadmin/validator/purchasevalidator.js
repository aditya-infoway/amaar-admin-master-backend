const Joi = require("joi");

const createPurchase = Joi.object().keys({
  terms: Joi.string().valid("Credit", "Cash", "Bank").required(),
  accountId: Joi.number().required().messages({ "any.required": "Party is required" }),
  billNo: Joi.string().required(),
  purchaseBillNo: Joi.string().required(),
  purchaseDate: Joi.string().required(),
  branchId: Joi.number().allow(null, ""),
  dueDate: Joi.string().allow(null, ""),
  narration: Joi.string().allow("", null),

  transportCharge: Joi.number().min(0).allow(null, "").default(0),
  loadingCharge: Joi.number().min(0).allow(null, "").default(0),
  otherCharge: Joi.number().min(0).allow(null, "").default(0),
  discountPct: Joi.number().min(0).max(100).allow(null, "").default(0),
  discountAmount: Joi.number().min(0).allow(null, "").default(0),
  roundAmount: Joi.number().allow(null, "").default(0),

  // ---- Cash / Bank conditional validation ----
  cashAccountId: Joi.when("terms", {
    is: "Cash",
    then: Joi.number().required().messages({ "any.required": "Cash account is required" }),
    otherwise: Joi.number().allow(null, ""),
  }),
  bankAccountId: Joi.when("terms", {
    is: "Bank",
    then: Joi.number().required().messages({ "any.required": "Bank account is required" }),
    otherwise: Joi.number().allow(null, ""),
  }),
  paymentMode: Joi.when("terms", {
    is: "Bank",
    then: Joi.string().valid("UPI", "NEFT", "RTGS", "IMPS", "CHEQUE", "CARD").required()
      .messages({ "any.required": "Payment mode is required" }),
    otherwise: Joi.string().allow(null, ""),
  }),
  chequeNo: Joi.when("paymentMode", {
    is: "CHEQUE",
    then: Joi.string().trim().required().messages({ "any.required": "Cheque No is required" }),
    otherwise: Joi.string().allow("", null),
  }),
  chequeDate: Joi.when("paymentMode", {
    is: "CHEQUE",
    then: Joi.string().required().messages({ "any.required": "Cheque Date is required" }),
    otherwise: Joi.string().allow("", null),
  }),
  chequeClearDate: Joi.string().allow("", null),
  bankNarration: Joi.string().allow("", null),

  items: Joi.array().min(1).items(
    Joi.object({
      itemId: Joi.number().required().messages({ "any.required": "Item id is required" }),
      itemCode: Joi.string().required(),
      itemName: Joi.string().required(),
      hsnCode: Joi.string().allow("", null),
      uom: Joi.string().allow("", null),
      qty: Joi.number().greater(0).required().messages({ "number.greater": "Qty must be greater than 0" }),
      rate: Joi.number().min(0).required(),
      discount: Joi.number().min(0).max(100).allow(null, "").default(0),
      taxable: Joi.number().min(0).required(),
      gstPct: Joi.number().min(0).required(),
      gstAmt: Joi.number().min(0).required(),
      total: Joi.number().min(0).required(),
    })
  ).required().messages({ "array.min": "Please add at least one item." }),
});

module.exports = { createPurchase };