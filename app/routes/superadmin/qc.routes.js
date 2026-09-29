const { errorResponse } = require("../../helper/index.js");
const qc = require("../../controllers/superadmin/controller/qccontroller.js");
const qcValidation = require("../../controllers/superadmin/validator/qcvalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return errorResponse(res, error.details.map((i) => i.message).join(","));
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/next-qc-no", qc.getNextQcNumber);
  routes.get("/grr-list", qc.getGrrListForQc);
  routes.get("/grr-items/:grrId", qc.getGrrItemsForQc);
  routes.get("/list", qc.getQcList);
  routes.get("/:id", qc.getQcById);

  routes.post("/create", validate(qcValidation.createQc), qc.createQc);

  app.use("/purchase-qc", routes);
};