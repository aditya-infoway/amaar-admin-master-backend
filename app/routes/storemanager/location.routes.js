const { errorResponse } = require("../../helper/index.js");
const location = require("../../controllers/superadmin/controller/locationcontroller.js");
const locationValidation = require("../../controllers/superadmin/validator/locationvalidator.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");

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
  routes.use(employeeAuth);

  routes.post(
    "/create",
    validate(locationValidation.createLocation),
    location.createLocation
  );

  routes.get("/list", location.getLocationList);

  routes.get("/:id", location.getLocationById);

  routes.put(
    "/update",
    validate(locationValidation.updateLocation),
    location.updateLocation
  );

  routes.delete(
    "/delete",
    validate(locationValidation.deleteLocation),
    location.deleteLocation
  );

  app.use("/storemanager/location", routes);
};