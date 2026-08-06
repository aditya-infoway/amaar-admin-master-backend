const followup = require("../../controllers/superadmin/controller/followupcontroller.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(employeeAuth);

  routes.post("/create", followup.createFollowUp);
  routes.get("/lead/:leadId", followup.getFollowUpsByLead);
  routes.get("/lead/:leadId/latest", followup.getLatestFollowUpByLead);
  routes.get("/board", followup.getFollowUpBoard);

  app.use("/employee/sales-executive/followup", routes);
};