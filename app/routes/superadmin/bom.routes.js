const { errorResponse } = require("../../helper/index.js");
const bom = require("../../controllers/superadmin/controller/bomcontroller.js");
const bomValidation = require("../../controllers/superadmin/validator/bomvalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    return errorResponse(res, message);
  }
  req.body = value;
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/list", bom.getBomList);
  routes.get("/check-item/:code", bom.checkItemCodeExists);
  routes.get("/:id", bom.getBomById);

  routes.post("/create", validate(bomValidation.createBom), bom.createBom);
  routes.put("/update", validate(bomValidation.updateBom), bom.updateBom);
  routes.delete("/delete", validate(bomValidation.deleteBom), bom.deleteBom);

  app.use("/master/bom", routes);
};