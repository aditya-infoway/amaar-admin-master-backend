const { errorResponse } = require("../../helper/index.js");
const account = require("../../controllers/superadmin/controller/accountcontroller.js");
const accountValidation = require("../../controllers/superadmin/validator/accountvalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");
const { createUploader } = require("../../middleware/upload.js");

const accountUpload = createUploader("account_kyc");

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

  // Create Account — multer PEHLE chalega taaki multipart body parse ho jaaye, phir validate() ko req.body milega
  routes.post(
    "/create",
    accountUpload.fields([
      { name: "aadharImage", maxCount: 1 },
      { name: "panImage", maxCount: 1 },
      { name: "gstImage", maxCount: 1 },
    ]),
    validate(accountValidation.createAccount),
    account.createAccount,
  );

  routes.get("/list", account.getAccountList);
  routes.get("/cash/list", account.getCashAccountList);
  routes.get("/bank/list", account.getBankAccountList);
  routes.get("/supplier/list", account.getSupplierAccountList);
  routes.get("/customer/list", account.getCustomerAccountList);
  routes.get("/opposite/list", account.getOppAccountList);
  routes.get("/sundry-creditor/list", account.getSundryCreditorAccountList);
  routes.get("/:id", account.getAccountById);

  // Update Account
  routes.put(
    "/update",
    accountUpload.fields([
      { name: "aadharImage", maxCount: 1 },
      { name: "panImage", maxCount: 1 },
      { name: "gstImage", maxCount: 1 },
    ]),
    validate(accountValidation.updateAccount),
    account.updateAccount,
  );

  routes.delete("/delete", validate(accountValidation.deleteAccount), account.deleteAccount);

  app.use("/master/account", routes);
};