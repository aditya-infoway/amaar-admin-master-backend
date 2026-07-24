const { errorResponse } = require("../../helper/index.js");
const purchaseOrder = require("../../controllers/superadmin/controller/purchaseordercontroller.js");
const purchaseOrderValidation = require("../../controllers/superadmin/validator/purchaseordervalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return errorResponse(res, error.details.map((i) => i.message).join(","));
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/next-po-no", purchaseOrder.getNextPoNumber);
  routes.get("/item-suppliers/:itemId", purchaseOrder.getItemSupplierInfo);
  routes.get("/list", purchaseOrder.getPurchaseOrderList);
  routes.get("/:id", purchaseOrder.getPurchaseOrderById);

  routes.post("/create", validate(purchaseOrderValidation.createPurchaseOrder), purchaseOrder.createPurchaseOrder);

  app.use("/purchase-order", routes);
};