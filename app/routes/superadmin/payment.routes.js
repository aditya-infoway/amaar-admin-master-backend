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

  app.use("/payment", routes);
};