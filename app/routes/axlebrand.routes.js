const { errorResponse } = require("../helper/index.js");
const axlebrand = require("../controllers/superadmin/controller/axlebrandcontroller.js");
const axlebrandValidation = require("../controllers/superadmin/validator/axlebrandvalidator.js");
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
    validate(axlebrandValidation.createAxleBrand),
    axlebrand.createAxleBrand
  );
  routes.get("/list", axlebrand.getAxleBrandList);
  routes.get("/:id", axlebrand.getAxleBrandById);
  routes.put(
    "/update",
    validate(axlebrandValidation.updateAxleBrand),
    axlebrand.updateAxleBrand
  );
  routes.delete(
    "/delete",
    validate(axlebrandValidation.deleteAxleBrand),
    axlebrand.deleteAxleBrand
  );

  app.use("/master/axlebrand", routes);
};