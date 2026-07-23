const stockReport = require("../../controllers/superadmin/controller/stockreportcontroller.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/list", stockReport.getStockReportList);
  routes.get("/:itemId", stockReport.getStockReportDetails);

  app.use("/stockreport", routes);
};