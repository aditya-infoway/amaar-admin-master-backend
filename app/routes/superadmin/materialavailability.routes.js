const materialAvailability = require("../../controllers/superadmin/controller/materialavailabilitycontroller.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(superAdminAuth);

  // Get material availability (leaf BOM items vs stock) for a Work Order
  routes.get("/:workOrderId", materialAvailability.getMaterialAvailability);

  app.use("/material-availability", routes);
};