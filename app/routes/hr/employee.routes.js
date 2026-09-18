const { errorResponse } = require("../../helper/index.js");

const employee = require("../../controllers/superadmin/controller/employeecontroller.js");

const employeeValidation = require("../../controllers/superadmin/validator/employeevalidator.js");

const { employeeAuth } = require("../../helper/employeeAuth.js");

const { createUploader } = require("../../middleware/upload.js");

const employeeUpload = createUploader("employee_register");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);

  if (error) {
    const message = error.details
      .map((i) => i.message)
      .join(",");

    console.log("error", message);

    return errorResponse(res, message);
  }

  next();
};

module.exports = (app) => {
  routes.use(employeeAuth);

  // ============================================================
  // SPECIFIC GET ROUTES FIRST
  // ============================================================

  // Next employee ID
  routes.get(
    "/next-employee-id",
    employee.getNextEmployeeId
  );

  // Unregistered employee list
  routes.get(
    "/unregistered-list",
    employee.getUnregisteredEmployeeList
  );

  // All employee list
  routes.get(
    "/list",
    employee.getEmployeeList
  );

  // Registered employee list
  routes.get(
    "/registered-list",
    employee.getRegisteredEmployeeList
  );

  // ============================================================
  // REGISTERED EMPLOYEE EDIT GET
  // ============================================================

  routes.get(
    "/registered/:id",
    employee.getRegisteredEmployeeById
  );

  // ============================================================
  // CREATE EMPLOYEE
  // ============================================================

  routes.post(
    "/create",
    validate(employeeValidation.createEmployee),
    employee.createEmployee
  );

  // ============================================================
  // REGISTER EMPLOYEE
  // ============================================================

  routes.post(
    "/register",

    employeeUpload.fields([
       { name: "employeePhoto", maxCount: 1 },
      {
        name: "aadharCardUpload",
        maxCount: 1,
      },
      {
        name: "drivingLicenceUpload",
        maxCount: 1,
      },
      {
        name: "panUpload",
        maxCount: 1,
      },
      {
        name: "voterIdUpload",
        maxCount: 1,
      },
    ]),

    (req, res, next) => {
      const { error } =
        employeeValidation.registerEmployee.validate(
          req.body
        );

      if (error) {
        const message = error.details
          .map((i) => i.message)
          .join(",");

        return errorResponse(res, message);
      }

      next();
    },

    employee.registerEmployee
  );

  // ============================================================
  // NORMAL EMPLOYEE UPDATE
  // ============================================================

  routes.put(
    "/update",
    validate(employeeValidation.updateEmployee),
    employee.updateEmployee
  );

  // ============================================================
  // REGISTERED EMPLOYEE EDIT / UPDATE
  // ============================================================

  routes.put(
    "/registered/update/:id",

    employeeUpload.fields([
       { name: "employeePhoto", maxCount: 1 },
      {
        name: "aadharCardUpload",
        maxCount: 1,
      },
      {
        name: "drivingLicenceUpload",
        maxCount: 1,
      },
      {
        name: "panUpload",
        maxCount: 1,
      },
      {
        name: "voterIdUpload",
        maxCount: 1,
      },
    ]),

    employee.updateRegisteredEmployee
  );

  // ============================================================
  // DELETE
  // ============================================================

  routes.delete(
    "/delete",
    validate(employeeValidation.deleteEmployee),
    employee.deleteEmployee
  );

  // ============================================================
  // /:id MUST ALWAYS BE LAST
  // ============================================================

  routes.get(
    "/:id",
    employee.getEmployeeById
  );

  // ============================================================
  // BASE ROUTE
  // ============================================================

  app.use(
    "/hr/employee",
    routes
  );
};