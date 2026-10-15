const { errorResponse } = require("../../helper/index.js");
const mainProcess = require("../../controllers/superadmin/controller/mainprocesscontroller.js");
const mainProcessValidation = require("../../controllers/superadmin/validator/mainprocessvalidator.js");
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

  routes.post(
    "/create",
    validate(mainProcessValidation.createMainProcess),
    mainProcess.createMainProcess
  );
  routes.get("/list", mainProcess.getMainProcessList);
routes.get("/next-code", mainProcess.getNextProcessCode);
  // "/status/:id" ko "/:id" se pehle rakhna zaruri hai
  routes.put(
    "/status/:id",
    validate(mainProcessValidation.updateStatus),
    mainProcess.updateMainProcessStatus
  );

  routes.get("/:id", mainProcess.getMainProcessById);
  routes.put(
    "/:id",
    validate(mainProcessValidation.updateMainProcess),
    mainProcess.updateMainProcess
  );
  routes.delete("/:id", mainProcess.deleteMainProcess);

  app.use("/main-process", routes);
};