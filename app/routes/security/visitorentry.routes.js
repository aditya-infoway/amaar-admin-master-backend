const { errorResponse } = require("../../helper/index.js");
const visitorEntry = require("../../controllers/employee/security/controller/visitorentrycontroller.js");
const visitorEntryValidation = require("../../controllers/employee/security/validator/visitorentryvalidator.js");
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

const entryUploader = createUploader("visitor_entry");

const entryPhotoFields = entryUploader.fields([
  { name: "idFrontPhoto", maxCount: 1 },
  { name: "idBackPhoto", maxCount: 1 },
  { name: "visitorPhoto", maxCount: 1 },
]);

module.exports = (app) => {
  routes.use(employeeAuth);

  routes.post(
    "/create",
    entryPhotoFields,
    validate(visitorEntryValidation.createVisitorEntry),
    visitorEntry.createVisitorEntry
  );
  routes.put(
    "/update/:id",
    entryPhotoFields,
    validate(visitorEntryValidation.updateVisitorEntry),
    visitorEntry.updateVisitorEntry
  );
  routes.get("/list", visitorEntry.getVisitorEntryList);
  routes.get("/:id", visitorEntry.getVisitorEntryById);
  routes.put(
    "/exit",
    validate(visitorEntryValidation.exitVisitorEntry),
    visitorEntry.exitVisitorEntry
  );
  routes.delete(
    "/delete",
    validate(visitorEntryValidation.deleteVisitorEntry),
    visitorEntry.deleteVisitorEntry
  );

  app.use("/employee/security/visitorentry", routes);
};