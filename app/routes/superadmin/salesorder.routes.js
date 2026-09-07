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

  // Get next Sales Order number
  routes.get(
    "/next-number",
    salesOrder.getNextSalesOrderNo
  );

  // Get Sales Order list
  routes.get(
    "/list",
    salesOrder.getSalesOrderList
  );

  // Get Sales Order by ID
  routes.get(
    "/:id",
    salesOrder.getSalesOrderById
  );

  // Create Sales Order
 routes.post(
  "/create",
  salesOrderUpload.fields([
    { name: "aadharImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 },
    { name: "gstImage", maxCount: 1 },
  ]),
  validate(salesOrderValidation.validateSalesOrder),
  salesOrder.createSalesOrder
);
  // Update Sales Order
routes.put(
  "/:id",
  salesOrderUpload.fields([
    { name: "aadharImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 },
    { name: "gstImage", maxCount: 1 },
  ]),
  validate(salesOrderValidation.validateSalesOrder),
  salesOrder.updateSalesOrder
);

  // Delete Sales Order
  routes.delete(
    "/:id",
    salesOrder.deleteSalesOrder
  );

  app.use("/salesorder", routes);
};