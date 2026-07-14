const { errorResponse } = require("../helper/index.js");
const productSeries = require("../controllers/superadmin/controller/productseriescontroller.js");
const productSeriesValidation = require("../controllers/superadmin/validator/productseriesvalidator.js");
const { superAdminAuth } = require("../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    console.log("error", message);
    return errorResponse(res, message);
  }
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.post(
    "/create",
    validate(productSeriesValidation.createProductSeries),
    productSeries.createProductSeries
  );
  routes.get("/list", productSeries.getProductSeriesList);
  routes.get("/:id", productSeries.getProductSeriesById);
  routes.put(
    "/update",
    validate(productSeriesValidation.updateProductSeries),
    productSeries.updateProductSeries
  );
  routes.delete(
    "/delete",
    validate(productSeriesValidation.deleteProductSeries),
    productSeries.deleteProductSeries
  );

  app.use("/master/productseries", routes);
};