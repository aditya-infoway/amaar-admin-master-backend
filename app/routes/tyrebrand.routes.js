const { errorResponse } = require("../helper/index.js");
const tyrebrand = require("../controllers/superadmin/controller/tyrebrandcontroller.js");
const tyrebrandValidation = require("../controllers/superadmin/validator/tyrebrandvalidator.js");
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
    validate(tyrebrandValidation.createTyreBrand),
    tyrebrand.createTyreBrand
  );
  routes.get("/list", tyrebrand.getTyreBrandList);
  routes.get("/:id", tyrebrand.getTyreBrandById);
  routes.put(
    "/update",
    validate(tyrebrandValidation.updateTyreBrand),
    tyrebrand.updateTyreBrand
  );
  routes.delete(
    "/delete",
    validate(tyrebrandValidation.deleteTyreBrand),
    tyrebrand.deleteTyreBrand
  );

  app.use("/master/tyrebrand", routes);
};