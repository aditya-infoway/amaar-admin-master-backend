const { errorResponse } = require("../helper/index.js");
const variant = require("../controllers/superadmin/controller/variantcontroller.js");
const variantValidation = require("../controllers/superadmin/validator/variantvalidator.js");
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
    validate(variantValidation.createVariant),
    variant.createVariant
  );
  routes.get("/list", variant.getVariantList);
  routes.get("/:id", variant.getVariantById);
  routes.put(
    "/update",
    validate(variantValidation.updateVariant),
    variant.updateVariant
  );
  routes.delete(
    "/delete",
    validate(variantValidation.deleteVariant),
    variant.deleteVariant
  );

  app.use("/master/variant", routes);
};