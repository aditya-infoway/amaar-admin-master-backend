const { errorResponse } = require("../../helper/index.js");
const subProcess = require("../../controllers/superadmin/controller/subprocesscontroller.js");
const subProcessValidation = require("../../controllers/superadmin/validator/subprocessvalidator.js");
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

  routes.post("/create", validate(subProcessValidation.createSubProcess), subProcess.createSubProcess);
  routes.get("/list", subProcess.getSubProcessList);

  // "/status/:id" ko "/:id" se pehle rakhna zaruri hai
  routes.put("/status/:id", validate(subProcessValidation.updateStatus), subProcess.updateSubProcessStatus);

  routes.put("/:id", validate(subProcessValidation.updateSubProcess), subProcess.updateSubProcess);
  routes.delete("/:id", subProcess.deleteSubProcess);

  app.use("/sub-process", routes);
};