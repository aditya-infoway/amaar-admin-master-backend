const { errorResponse } = require("../../helper/index.js");
const employee = require("../../controllers/employee/logincontroller.js");
const employeeValidation = require("../../controllers/employee/loginvalidator.js");
const { checktoken } = require("../../middleware/token.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    errorResponse(res, message);
  } else {
    next();
  }
};

module.exports = (app) => {
  routes.use(checktoken); // sirf apitoken check — sabhi routes ke liye theek hai

  routes.post("/login", validate(employeeValidation.employeeLogin), employee.employeeLogin);

  // 👇 inn teeno ko login token verify karne wala middleware chahiye,
  // taaki req.employeeId set ho
  routes.post("/checkout", employeeAuth, employee.employeeCheckout);
  routes.get("/attendance-status", employeeAuth, employee.getAttendanceStatus);
  routes.get("/financial-years", employeeAuth, employee.getFinancialYears);

  app.use("/employee/", routes);
};