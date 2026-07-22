const { errorResponse } = require("../../helper/index.js");
const category = require("../../controllers/superadmin/controller/categorycontroller.js");
const categoryValidation = require("../../controllers/superadmin/validator/categoryvalidator.js"); // agar yahi folder me hai
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
  routes.use(superAdminAuth); // sirf token bhejna hoga, companyId yahi se milega

  routes.post("/create", validate(categoryValidation.createCategory), category.createCategory);
  routes.get("/list", category.getCategoryList);
  routes.get("/:id", category.getCategoryById);
  routes.put("/update", validate(categoryValidation.updateCategory), category.updateCategory);
  routes.delete("/delete", validate(categoryValidation.deleteCategory), category.deleteCategory);

  app.use("/master/category", routes);
};