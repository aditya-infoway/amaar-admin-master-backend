const { errorResponse } = require("../../helper/index.js");
const enquirysource = require("../../controllers/superadmin/controller/enquirysourcecontroller.js");
const enquirysourceValidation = require("../../controllers/superadmin/validator/enquirysourcevalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

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
    validate(enquirysourceValidation.createEnquirySource),
    enquirysource.createEnquirySource
  );
  routes.get("/list", enquirysource.getEnquirySourceList);
  routes.get("/:id", enquirysource.getEnquirySourceById);
  routes.put(
    "/update",
    validate(enquirysourceValidation.updateEnquirySource),
    enquirysource.updateEnquirySource
  );
  routes.delete(
    "/delete",
    validate(enquirysourceValidation.deleteEnquirySource),
    enquirysource.deleteEnquirySource
  );

  app.use("/master/enquirysource", routes);
};