const { errorResponse } = require("../../helper/index.js");
const vehicleEntry = require("../../controllers/employee/security/controller/vehicleentrycontroller.js");
const vehicleEntryValidation = require("../../controllers/employee/security/validator/vehicleentryvalidator.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");
const { createUploader } = require("../../middleware/upload.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    console.log("error", message);
    return errorResponse(res, message);
  }
  req.body = value;
  next();
};

const entryUploader = createUploader("vehicle_entry");

const entryPhotoFields = entryUploader.fields([
  { name: "driverPhoto", maxCount: 1 },
  { name: "rcPhoto", maxCount: 1 },
  { name: "vehiclePhotoFront", maxCount: 1 },
  { name: "vehiclePhotoBack", maxCount: 1 },
]);

const exitPhotoFields = entryUploader.fields([
  { name: "exitPhotoFront", maxCount: 1 },
  { name: "exitPhotoBack", maxCount: 1 },
]);

module.exports = (app) => {
  routes.use(employeeAuth);

  routes.post(
    "/create",
    entryPhotoFields,
    validate(vehicleEntryValidation.createVehicleEntry),
    vehicleEntry.createVehicleEntry
  );
  routes.get("/list", vehicleEntry.getVehicleEntryList);
  routes.get("/:id", vehicleEntry.getVehicleEntryById);
  routes.put(
    "/update",
    entryPhotoFields,
    validate(vehicleEntryValidation.updateVehicleEntry),
    vehicleEntry.updateVehicleEntry
  );
  routes.put(
    "/exit",
    exitPhotoFields,
    validate(vehicleEntryValidation.exitVehicleEntry),
    vehicleEntry.exitVehicleEntry
  );
  routes.delete(
    "/delete",
    validate(vehicleEntryValidation.deleteVehicleEntry),
    vehicleEntry.deleteVehicleEntry
  );

  app.use("/employee/security/vehicleentry", routes);
};