const { errorResponse } = require("../../helper/index.js");

const quotation = require("../../controllers/superadmin/controller/quotationcontroller.js");

const quotationValidation = require("../../controllers/superadmin/validator/quotationvalidator.js");

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

  routes.get(
    "/next-number",
    quotation.getNextQuotationNo
  );

  routes.get(
    "/list",
    quotation.getQuotationList
  );

  routes.get(
    "/:id",
    quotation.getQuotationById
  );

  routes.post(
    "/create",
    validate(quotationValidation.validateQuotation),
    quotation.createQuotation
  );

  routes.put(
    "/:id",
    validate(quotationValidation.validateQuotation),
    quotation.updateQuotation
  );

  routes.delete(
    "/:id",
    quotation.deleteQuotation
  );

  app.use("/quotation", routes);
};