const { errorResponse } = require("../../helper/index.js");
const payment = require("../../controllers/superadmin/controller/paymentcontroller.js");
const paymentValidation = require("../../controllers/superadmin/validator/paymentvalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    return errorResponse(res, message);
  }
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/next-voucher-no", payment.getNextVoucherNo);

  routes.get("/cash/list", payment.getCashPaymentList);
  routes.post("/cash/create", validate(paymentValidation.createCashPayment), payment.createCashPayment);

  routes.get("/bank/list", payment.getBankPaymentList);
  routes.post("/bank/create", validate(paymentValidation.createBankPayment), payment.createBankPayment);

  routes.get("/cash-book", payment.getCashBook);  
  routes.get("/bank-book", payment.getBankBook);

  routes.get("/cash-receipt/list", payment.getCashReceiptList);
routes.post("/cash-receipt/create", validate(paymentValidation.createCashReceipt), payment.createCashReceipt);

routes.get("/bank-receipt/list", payment.getBankReceiptList);
routes.post("/bank-receipt/create", validate(paymentValidation.createBankReceipt), payment.createBankReceipt);

  app.use("/payment", routes);
};