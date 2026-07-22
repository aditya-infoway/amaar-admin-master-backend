const { errorResponse } = require("../../helper/index.js");
const purchase = require("../../controllers/superadmin/controller/purchasecontroller.js");
const purchaseValidation = require("../../controllers/superadmin/validator/purchasevalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return errorResponse(res, error.details.map((i) => i.message).join(","));
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/next-bill-no", purchase.getNextBillNo);
  routes.get("/list", purchase.getPurchaseList);
  routes.get("/:id", purchase.getPurchaseById);

  routes.post("/create", validate(purchaseValidation.createPurchase), purchase.createPurchase);

  app.use("/purchase", routes);
};