// routes/purchase-grr/grrroutes.js
const { errorResponse } = require("../../helper/index.js");
const grr = require("../../controllers/superadmin/controller/grrcontroller.js");
const grrValidation = require("../../controllers/superadmin/validator/grrvalidator.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");
var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return errorResponse(res, error.details.map((i) => i.message).join(","));
  next();
};

module.exports = (app) => {
  routes.use(employeeAuth);

  routes.get("/next-grr-no", grr.getNextGrrNumber);
  routes.get("/po-list", grr.getPurchaseOrdersForGrr);
  routes.get("/po-items/:purchaseOrderId", grr.getPoItemsForGrr);
  routes.get("/list", grr.getGrrList);
  routes.get("/:id", grr.getGrrById);

  routes.post("/create", validate(grrValidation.createGrr), grr.createGrr);

  app.use("/storemanager/purchase-grr", routes);
};