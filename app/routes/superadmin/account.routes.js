const { errorResponse } = require("../../helper/index.js");
const account = require("../../controllers/superadmin/controller/accountcontroller.js");
const accountValidation = require("../../controllers/superadmin/validator/accountvalidator.js");
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

  routes.post("/create", validate(accountValidation.createAccount), account.createAccount);
  routes.get("/list", account.getAccountList);
  routes.get("/cash/list", account.getCashAccountList);
  routes.get("/bank/list", account.getBankAccountList);
  routes.get("/supplier/list", account.getSupplierAccountList);
  routes.get("/customer/list", account.getCustomerAccountList);
  routes.get("/:id", account.getAccountById);
  routes.put("/update", validate(accountValidation.updateAccount), account.updateAccount);
  routes.delete("/delete", validate(accountValidation.deleteAccount), account.deleteAccount);

  app.use("/master/account", routes);
};