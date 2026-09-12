const { errorResponse } = require("../../helper/index.js");

const indent = require("../../controllers/superadmin/controller/indentcontroller.js");

const indentValidation = require("../../controllers/superadmin/validator/indentvalidator.js");

const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);

  if (error) {
    return errorResponse(
      res,
      error.details.map((i) => i.message).join(",")
    );
  }

  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  // Preview next Indent number (optional — createIndent generates its own)
  routes.get("/next-number", indent.getNextIndentNo);

  // Indent list page
  routes.get("/list", indent.getIndentList);

  // Save-button state: does an Indent already exist for this Work Order?
  routes.get("/check/:workOrderId", indent.checkIndentForWorkOrder);

  // View drawer — header + full items table
  routes.get("/:id", indent.getIndentById);

  // Save (once per Work Order) — create only, no update/delete
  routes.post(
    "/create",
    validate(indentValidation.validateIndent),
    indent.createIndent
  );

  app.use("/indent", routes);
};