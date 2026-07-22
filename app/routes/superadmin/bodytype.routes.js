const { errorResponse } = require("../../helper/index.js");
const bodytype = require("../../controllers/superadmin/controller/bodytypecontroller.js");
const bodytypeValidation = require("../../controllers/superadmin/validator/bodytypevalidator.js");
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
    validate(bodytypeValidation.createBodyType),
    bodytype.createBodyType
  );
  routes.get("/list", bodytype.getBodyTypeList);
  routes.get("/:id", bodytype.getBodyTypeById);
  routes.put(
    "/update",
    validate(bodytypeValidation.updateBodyType),
    bodytype.updateBodyType
  );
  routes.delete(
    "/delete",
    validate(bodytypeValidation.deleteBodyType),
    bodytype.deleteBodyType
  );

  app.use("/master/bodytype", routes);
};