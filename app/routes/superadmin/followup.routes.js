const followup = require("../../controllers/superadmin/controller/followupcontroller.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.post("/create", followup.createFollowUp);
  routes.get("/lead/:leadId", followup.getFollowUpsByLead);
  routes.get("/lead/:leadId/latest", followup.getLatestFollowUpByLead);
  routes.get("/board", followup.getFollowUpBoard);

  app.use("/followup", routes);
};