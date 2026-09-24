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

  // 👇 naya — dynamic audit fields, dono optional (na bheje to controller fallback use karega)
  createdBy: Joi.number().allow(null),
  createdType: Joi.string().trim().allow("", null),
});

const createBankPayment = Joi.object().keys({
  bankAccountId: Joi.number().required().messages({
    "any.required": "Bank account is required",
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
  transactionMode: Joi.string().valid("NEFT", "RTGS", "IMPS", "CHEQUE", "UPI").required().messages({
    "any.only": "Please select a valid transaction mode",
    "string.empty": "Transaction mode is required",
  }),
  chequeNo: Joi.string().trim().when("transactionMode", {
    is: "CHEQUE",
    then: Joi.string().trim().required().messages({ "string.empty": "Cheque number is required" }),
    otherwise: Joi.string().trim().allow("", null),
  }),
  chequeDate: Joi.string().trim().when("transactionMode", {
    is: "CHEQUE",
    then: Joi.string().trim().required().messages({ "string.empty": "Cheque date is required" }),
    otherwise: Joi.string().trim().allow("", null),
  }),
  chequeClearDate: Joi.string().trim().allow("", null),
  narration: Joi.string().trim().allow("", null),
  financialYearId: Joi.number().required().messages({
    "any.required": "Financial year is required",
  }),

  // 👇 naya
  createdBy: Joi.number().allow(null),
  createdType: Joi.string().trim().allow("", null),
});


const createCashReceipt = Joi.object().keys({
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
  createdBy: Joi.number().allow(null),
  createdType: Joi.string().trim().allow("", null),
});

const createBankReceipt = Joi.object().keys({
  bankAccountId: Joi.number().required().messages({
    "any.required": "Bank account is required",
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
  transactionMode: Joi.string().valid("NEFT", "RTGS", "IMPS", "CHEQUE", "UPI").required().messages({
    "any.only": "Please select a valid transaction mode",
    "string.empty": "Transaction mode is required",
  }),
  chequeNo: Joi.string().trim().when("transactionMode", {
    is: "CHEQUE",
    then: Joi.string().trim().required().messages({ "string.empty": "Cheque number is required" }),
    otherwise: Joi.string().trim().allow("", null),
  }),
  chequeDate: Joi.string().trim().when("transactionMode", {
    is: "CHEQUE",
    then: Joi.string().trim().required().messages({ "string.empty": "Cheque date is required" }),
    otherwise: Joi.string().trim().allow("", null),
  }),
  chequeClearDate: Joi.string().trim().allow("", null),
  narration: Joi.string().trim().allow("", null),
  financialYearId: Joi.number().required().messages({
    "any.required": "Financial year is required",
  }),
  createdBy: Joi.number().allow(null),
  createdType: Joi.string().trim().allow("", null),
});
const createContra = Joi.object().keys({
  type: Joi.string().valid("deposit", "withdrawal", "transfer").required().messages({
    "any.only": "Please select a valid contra type",
    "string.empty": "Type is required",
    "any.required": "Type is required",
  }),
  accountId: Joi.number().required().messages({
    "any.required": "Account is required",
  }),
  voucherNo: Joi.string().trim().required().messages({
    "string.empty": "Voucher No is required",
  }),
  date: Joi.string().trim().required().messages({
    "string.empty": "Date is required",
  }),
  oppAccountId: Joi.number().required().messages({
    "any.required": "Opp. account is required",
  }).invalid(Joi.ref("accountId")).messages({
    "any.invalid": "Account and opposite account cannot be the same",
  }),
  amount: Joi.number().positive().required().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than 0",
  }),
  narration: Joi.string().trim().allow("", null),
  financialYearId: Joi.number().required().messages({
    "any.required": "Financial year is required",
  }),
  createdBy: Joi.number().allow(null),
  createdType: Joi.string().trim().allow("", null),
});
module.exports = {
  createCashPayment,
  createBankPayment,
  // new
  createCashReceipt,
  createBankReceipt,
    createContra,
};

