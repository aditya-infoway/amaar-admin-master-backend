const stockReport = require("../../controllers/superadmin/controller/stockreportcontroller.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(employeeAuth);

  routes.get("/list", stockReport.getStockReportList);
  routes.get("/:itemId", stockReport.getStockReportDetails);

  app.use("/storemanager/stockreport", routes);
};