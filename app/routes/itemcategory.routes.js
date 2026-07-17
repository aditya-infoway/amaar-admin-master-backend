const { errorResponse } = require("../helper/index.js");
const itemcategory = require("../controllers/superadmin/controller/itemcategorycontroller.js");
const itemcategoryValidation = require("../controllers/superadmin/validator/itemcategoryvalidator.js");
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
    validate(itemcategoryValidation.createItemCategory),
    itemcategory.createItemCategory
  );
  routes.get("/list", itemcategory.getItemCategoryList);
  routes.get("/:id", itemcategory.getItemCategoryById);
  routes.put(
    "/update",
    validate(itemcategoryValidation.updateItemCategory),
    itemcategory.updateItemCategory
  );
  routes.delete(
    "/delete",
    validate(itemcategoryValidation.deleteItemCategory),
    itemcategory.deleteItemCategory
  );

  app.use("/master/itemcategory", routes);
};