const { errorResponse } = require("../../helper/index.js");
const enquirytype = require("../../controllers/superadmin/controller/enquirytypecontroller.js");
const enquirytypeValidation = require("../../controllers/superadmin/validator/enquirytypevalidator.js");
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
    validate(enquirytypeValidation.createEnquiryType),
    enquirytype.createEnquiryType
  );
  routes.get("/list", enquirytype.getEnquiryTypeList);
  routes.get("/:id", enquirytype.getEnquiryTypeById);
  routes.put(
    "/update",
    validate(enquirytypeValidation.updateEnquiryType),
    enquirytype.updateEnquiryType
  );
  routes.delete(
    "/delete",
    validate(enquirytypeValidation.deleteEnquiryType),
    enquirytype.deleteEnquiryType
  );

  app.use("/master/enquirytype", routes);
};