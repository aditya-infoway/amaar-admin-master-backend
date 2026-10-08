const { errorResponse } = require("../../helper/index.js");
const contractorType = require("../../controllers/superadmin/controller/contractortypecontroller.js");
const employeeValidation = require("../../controllers/superadmin/validator/employeevalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    console.log("error", message);
    return errorResponse(res, message);
  }
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/list", contractorType.getContractorTypeList);

  routes.put(
    "/update",
    validate(employeeValidation.updateContractorType),
    contractorType.updateContractorType
  );

  app.use("/master/contractor-type", routes);
};