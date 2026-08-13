const { errorResponse } = require("../../helper/index.js");
const lead = require("../../controllers/superadmin/controller/leadcontroller.js");
const leadValidation = require("../../controllers/superadmin/validator/leadvalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

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
  routes.use(superAdminAuth);

  routes.get("/next-lead-id", lead.getNextLeadId);
  routes.get("/list", lead.getLeadList);
  routes.get("/:id", lead.getLeadById);

  routes.post("/create", validate(leadValidation.createLead), lead.createLead);
  routes.put("/update", validate(leadValidation.updateLead), lead.updateLead);
  routes.delete("/delete", validate(leadValidation.deleteLead), lead.deleteLead);

  app.use("/lead", routes);
};