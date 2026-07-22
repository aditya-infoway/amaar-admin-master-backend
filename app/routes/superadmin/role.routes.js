const role = require("../../controllers/superadmin/controller/rolecontroller.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/list", role.getRoleList);

  app.use("/master/role", routes);
};