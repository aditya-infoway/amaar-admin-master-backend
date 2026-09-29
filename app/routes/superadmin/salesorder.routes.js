const { errorResponse } = require("../../helper/index.js");

const salesOrder = require("../../controllers/superadmin/controller/salesordercontroller.js");

const salesOrderValidation = require("../../controllers/superadmin/validator/salesordervalidator.js");

const { superAdminAuth } = require("../../helper/superAdminAuth.js");

const { createUploader } = require("../../middleware/upload.js");

const salesOrderUpload = createUploader("sales_order");

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

  routes.get("/next-number", salesOrder.getNextSalesOrderNo);
  routes.get("/list", salesOrder.getSalesOrderList);
  routes.get("/:id", salesOrder.getSalesOrderById);

  routes.post(
    "/create",
    validate(salesOrderValidation.validateSalesOrder),
    salesOrder.createSalesOrder
  );

  routes.put(
    "/:id",
    validate(salesOrderValidation.validateSalesOrder),
    salesOrder.updateSalesOrder
  );

  routes.delete("/:id", salesOrder.deleteSalesOrder);

  app.use("/salesorder", routes);
};