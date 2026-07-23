// controllers/superadmin/validator/paymentvalidator.js
const Joi = require("joi");

const createCashPayment = Joi.object().keys({
  cashAccountId: Joi.number().required().messages({
    "any.required": "Cash account is required",
  }),
  voucherNo: Joi.string().trim().required().messages({
    "string.empty": "Voucher No is required",
  }),
  date: Joi.string().trim().required().messages({
    "string.empty": "Date is required",
  }),
  oppAccountId: Joi.number().required().messages({
    "any.required": "Opp. account is required",
  }),
  amount: Joi.number().positive().required().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than 0",
  }),
  narration: Joi.string().trim().allow("", null),
  financialYearId: Joi.number().required().messages({
    "any.required": "Financial year is required",
  }),
  // NOTE: bomNo / paymentMode="bom" jaan-bujhke schema mein nahi rakha —
  // BOM abhi save nahi hota, isliye validator/DB dono mein iska field nahi he.
});

module.exports = { createCashPayment };