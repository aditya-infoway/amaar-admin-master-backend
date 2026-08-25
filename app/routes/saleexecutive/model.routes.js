const { errorResponse } = require("../../helper/index.js");
const model = require("../../controllers/superadmin/controller/modelcontroller.js");
const modelValidation = require("../../controllers/superadmin/validator/modelvalidator.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");

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
  routes.use(employeeAuth);

  routes.post(
    "/create",
    validate(modelValidation.createModel),
    model.createModel
  );
  routes.get("/list", model.getModelList);
  routes.get("/:id", model.getModelById);
  routes.put(
    "/update",
    validate(modelValidation.updateModel),
    model.updateModel
  );
  routes.delete(
    "/delete",
    validate(modelValidation.deleteModel),
    model.deleteModel
  );

  app.use("/employee/sales-executive/model", routes);
};