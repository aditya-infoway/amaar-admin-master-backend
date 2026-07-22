const { errorResponse } = require("../../helper/index.js");
const employee = require("../../controllers/employee/logincontroller.js");
const employeeValidation = require("../../controllers/employee/loginvalidator.js");
const { checktoken } = require("../../middleware/token.js");
const multer = require("multer");
const { log } = require("console");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    console.log("error", message);
    errorResponse(res, message);
  } else {
    next();
  }
};

module.exports = (app) => {
  routes.use(checktoken);
  routes.post("/login", validate(employeeValidation.employeeLogin), employee.employeeLogin);

  routes.get("/financial-years", employee.getFinancialYears);

  app.use("/employee/", routes);
};