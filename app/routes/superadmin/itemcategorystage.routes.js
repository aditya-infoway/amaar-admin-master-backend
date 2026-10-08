const { errorResponse } = require("../../helper/index.js");

const controller = require("../../controllers/superadmin/controller/itemcategorystagecontroller.js");
const validation = require("../../controllers/superadmin/validator/itemcategorystagevalidator.js");

const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);

  if (error) {
    return errorResponse(res, error.details.map((i) => i.message).join(","));
  }

  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/list", controller.getItemCategoryStageList);

  routes.post(
    "/create",
    validate(validation.validateItemCategoryStage),
    controller.createItemCategoryStage,
  );

  routes.put(
    "/:id",
    validate(validation.validateItemCategoryStage),
    controller.updateItemCategoryStage,
  );

  routes.delete("/:id", controller.deleteItemCategoryStage);

  app.use("/itemcategory-stage", routes);
};