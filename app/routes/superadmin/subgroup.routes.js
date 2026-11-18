const { errorResponse } = require("../../helper/index.js");
const subgroup = require("../../controllers/superadmin/controller/subgroupcontroller.js");
const subgroupValidation = require("../../controllers/superadmin/validator/subgroupvalidator.js");
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

  routes.get("/parents", subgroup.getParentOptions);
  routes.post("/create", validate(subgroupValidation.createSubGroup), subgroup.createSubGroup);
  routes.get("/list", subgroup.getSubGroupList);
  routes.put("/update", validate(subgroupValidation.updateSubGroup), subgroup.updateSubGroup);
  routes.delete("/delete", validate(subgroupValidation.deleteSubGroup), subgroup.deleteSubGroup);

  app.use("/master/subgroup", routes);
};