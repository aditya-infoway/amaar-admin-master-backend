const { errorResponse } = require("../../helper/index.js");
const ledgerReport = require("../../controllers/superadmin/controller/ledgerreportcontroller.js");
// const accountValidation = require("../../controllers/superadmin/validator/accountvalidator.js");
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

  routes.get("/list", ledgerReport.getLedgerReportList);
  routes.get("/details", ledgerReport.getLedgerDetails);

  app.use("/ledger-report", routes);
};