const { errorResponse } = require("../../helper/index.js");
const profession = require("../../controllers/superadmin/controller/professioncontroller.js");
const professionValidation = require("../../controllers/superadmin/validator/professionvalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    console.log("error", message);
    return errorResponse(res, message);
  }
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.post(
    "/create",
    validate(professionValidation.createProfession),
    profession.createProfession
  );
  routes.get("/list", profession.getProfessionList);
  routes.get("/:id", profession.getProfessionById);
  routes.put(
    "/update",
    validate(professionValidation.updateProfession),
    profession.updateProfession
  );
  routes.delete(
    "/delete",
    validate(professionValidation.deleteProfession),
    profession.deleteProfession
  );

  app.use("/master/profession", routes);
};