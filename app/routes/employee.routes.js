const { errorResponse } = require("../helper/index.js");
const employee = require("../controllers/superadmin/controller/employeecontroller.js");
const employeeValidation = require("../controllers/superadmin/validator/employeevalidator.js");
const { superAdminAuth } = require("../helper/superAdminAuth.js");

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

  routes.post(
    "/create",
    validate(employeeValidation.createEmployee),
    employee.createEmployee
  );
  routes.get("/list", employee.getEmployeeList);
  routes.get("/:id", employee.getEmployeeById);
  routes.put(
    "/update",
    validate(employeeValidation.updateEmployee),
    employee.updateEmployee
  );
  routes.delete(
    "/delete",
    validate(employeeValidation.deleteEmployee),
    employee.deleteEmployee
  );

  app.use("/master/employee", routes);
};