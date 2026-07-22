const group = require("../../controllers/superadmin/controller/groupcontroller.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(superAdminAuth);
  routes.get("/list", group.getGroupList);
  app.use("/master/group", routes);
};