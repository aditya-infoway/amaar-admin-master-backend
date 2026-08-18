const { errorResponse } = require("../../helper/index.js");

const createMaster = require("../../controllers/superadmin/controller/createmastercontroller.js");

const createMasterValidation = require("../../controllers/superadmin/validator/createmastervalidator.js");

const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

// ---------------- VALIDATION MIDDLEWARE ----------------

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);

  if (error) {
    const message = error.details.map((i) => i.message).join(",");

    return errorResponse(res, message);
  }

  next();
};

// ---------------- ROUTES ----------------

module.exports = (app) => {
  // Authentication
  routes.use(superAdminAuth);

  // Create
  routes.post(
    "/create",
    validate(createMasterValidation.createCreateMaster),
    createMaster.createCreateMaster,
  );

  // List
  routes.get("/list", createMaster.getCreateMasterList);

  // Get by ID
  routes.get("/:id", createMaster.getCreateMasterById);

  // Update
  routes.put(
    "/update",
    validate(createMasterValidation.updateCreateMaster),
    createMaster.updateCreateMaster,
  );

  // Delete
  routes.delete(
    "/delete",
    validate(createMasterValidation.deleteCreateMaster),
    createMaster.deleteCreateMaster,
  );

  // Base route
  app.use("/master/createmaster", routes);
};
