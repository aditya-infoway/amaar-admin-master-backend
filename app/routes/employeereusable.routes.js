const { errorResponse } = require("../helper/index.js");
const model = require("../controllers/superadmin/controller/modelcontroller.js");
const { employeeAuth } = require("../helper/employeeAuth.js");
const role = require("../controllers/superadmin/controller/rolecontroller.js");
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
  routes.use(employeeAuth);

  routes.get("/model/list", model.getModelList);
 routes.get("/role/list", role.getRoleList);
  app.use("/employee", routes);
};