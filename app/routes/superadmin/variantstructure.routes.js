const { errorResponse } = require("../../helper/index.js");
const variantStructure = require("../../controllers/superadmin/controller/variantstructurecontroller.js");
const variantStructureValidation = require("../../controllers/superadmin/validator/variantstructurevalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    return errorResponse(res, message);
  }
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  // IMPORTANT: /available-variants must stay above /:id
  routes.get("/available-variants", variantStructure.getAvailableVariants);
  routes.post("/create", validate(variantStructureValidation.createVariantStructure), variantStructure.createVariantStructure);
  routes.get("/list", variantStructure.getVariantStructureList);
  routes.get("/:id", variantStructure.getVariantStructureById);
  routes.put("/update", validate(variantStructureValidation.updateVariantStructure), variantStructure.updateVariantStructure);
  routes.delete("/delete", validate(variantStructureValidation.deleteVariantStructure), variantStructure.deleteVariantStructure);

  app.use("/master/variantstructure", routes);
};