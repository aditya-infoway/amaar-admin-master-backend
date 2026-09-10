const { errorResponse } = require("../../helper/index.js");

const workOrder = require("../../controllers/superadmin/controller/workOrderController");

const workOrderValidation = require("../../controllers/superadmin/validator/workOrderValidation.js");

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

  // Get next Work Order number
  routes.get(
    "/next-number",
    workOrder.getNextWorkOrderNo
  );

  // Get Work Order list
  routes.get(
    "/list",
    workOrder.getWorkOrderList
  );

  // Get Work Order by ID
  routes.get(
    "/:id",
    workOrder.getWorkOrderById
  );

  // Create Work Order
  routes.post(
    "/create",
    validate(workOrderValidation.validateWorkOrder),
    workOrder.createWorkOrder
  );

  // Update Work Order
  routes.put(
    "/:id",
    validate(workOrderValidation.validateWorkOrder),
    workOrder.updateWorkOrder
  );

  // Delete Work Order
  routes.delete(
    "/:id",
    workOrder.deleteWorkOrder
  );

  app.use("/workorder", routes);
};