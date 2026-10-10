const { errorResponse } = require("../../helper/index.js");

const sales = require("../../controllers/superadmin/controller/salesregistercontroller");

const salesValidation = require("../../controllers/superadmin/validator/salesregistervalidator");

const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);

  if (error) {
    return errorResponse(
      res,
      error.details.map((i) => i.message).join(","),
    );
  }

  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  // NOTE: static paths hamesha "/:id" se pehle
  routes.get("/next-invoice-no", sales.getNextSalesInvoiceNo);
  routes.get("/list", sales.getSalesList);
  routes.get("/pending-credit-list", sales.getPendingCreditInvoices);
  
    routes.get("/print/:id", sales.printSalesInvoice);  
    
  routes.get("/:id", sales.getSalesById);

  routes.post(
    "/create",
    validate(salesValidation.validateSales),
    sales.createSales,
  );

  routes.put(
    "/:id",
    validate(salesValidation.validateSales),
    sales.updateSales,
  );

  routes.delete("/:id", sales.deleteSales);

  app.use("/sales", routes);
};