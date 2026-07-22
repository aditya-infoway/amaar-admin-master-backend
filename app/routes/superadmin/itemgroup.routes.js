const { errorResponse } = require("../../helper/index.js");
const itemgroup = require("../../controllers/superadmin/controller/itemgroupcontroller.js");
const itemgroupValidation = require("../../controllers/superadmin/validator/itemgroupvalidator.js");
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
    validate(itemgroupValidation.createItemGroup),
    itemgroup.createItemGroup
  );
  routes.get("/list", itemgroup.getItemGroupList);
  routes.get("/:id", itemgroup.getItemGroupById);
  routes.put(
    "/update",
    validate(itemgroupValidation.updateItemGroup),
    itemgroup.updateItemGroup
  );
  routes.delete(
    "/delete",
    validate(itemgroupValidation.deleteItemGroup),
    itemgroup.deleteItemGroup
  );

  app.use("/master/itemgroup", routes);
};