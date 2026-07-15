const { errorResponse } = require("../helper/index.js");
const hydraulicbrand = require("../controllers/superadmin/controller/hydraulicbrandcontroller.js");
const hydraulicbrandValidation = require("../controllers/superadmin/validator/hydraulicbrandvalidator.js");
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
    validate(hydraulicbrandValidation.createHydraulicBrand),
    hydraulicbrand.createHydraulicBrand
  );
  routes.get("/list", hydraulicbrand.getHydraulicBrandList);
  routes.get("/:id", hydraulicbrand.getHydraulicBrandById);
  routes.put(
    "/update",
    validate(hydraulicbrandValidation.updateHydraulicBrand),
    hydraulicbrand.updateHydraulicBrand
  );
  routes.delete(
    "/delete",
    validate(hydraulicbrandValidation.deleteHydraulicBrand),
    hydraulicbrand.deleteHydraulicBrand
  );

  app.use("/master/hydraulicbrand", routes);
};