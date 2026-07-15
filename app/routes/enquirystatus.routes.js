const { errorResponse } = require("../helper/index.js");
const enquirystatus = require("../controllers/superadmin/controller/enquirystatuscontroller.js");
const enquirystatusValidation = require("../controllers/superadmin/validator/enquirystatusvalidator.js");
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
    validate(enquirystatusValidation.createEnquiryStatus),
    enquirystatus.createEnquiryStatus
  );
  routes.get("/list", enquirystatus.getEnquiryStatusList);
  routes.get("/:id", enquirystatus.getEnquiryStatusById);
  routes.put(
    "/update",
    validate(enquirystatusValidation.updateEnquiryStatus),
    enquirystatus.updateEnquiryStatus
  );
  routes.delete(
    "/delete",
    validate(enquirystatusValidation.deleteEnquiryStatus),
    enquirystatus.deleteEnquiryStatus
  );

  app.use("/master/enquirystatus", routes);
};