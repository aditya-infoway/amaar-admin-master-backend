const { errorResponse } = require("../../helper/index.js");

const createPricing = require("../../controllers/superadmin/controller/createpricingcontroller.js");

const createPricingValidation = require("../../controllers/superadmin/validator/createpricingvalidator.js");

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

  // ============================================================
  // CREATE
  // ============================================================

  routes.post(
    "/create",
    validate(createPricingValidation.createCreatePricing),
    createPricing.createCreatePricing,
  );

  routes.post(
    "/bulk-import",
    validate(createPricingValidation.bulkImportCreatePricing),
    createPricing.bulkImportCreatePricing,
  );

  // ============================================================
  // LIST
  // ============================================================

  routes.get("/list", createPricing.getCreatePricingList);

  routes.get("/", createPricing.getCreateMasterForPricingExport);

  // ============================================================
  // CHECK CODE
  // IMPORTANT: MUST COME BEFORE /:id
  // ============================================================

  routes.get("/check-code", createPricing.checkCreatePricingCode);

  // ============================================================
  // GET BY ID
  // ============================================================

  routes.get("/:id", createPricing.getCreatePricingById);

  // ============================================================
  // UPDATE
  // ============================================================

  routes.put(
    "/update",
    validate(createPricingValidation.updateCreatePricing),
    createPricing.updateCreatePricing,
  );

  // ============================================================
  // DELETE
  // ============================================================

  routes.delete(
    "/delete",
    validate(createPricingValidation.deleteCreatePricing),
    createPricing.deleteCreatePricing,
  );

  // ============================================================
  // BASE ROUTE
  // ============================================================

  app.use("/master/createpricing", routes);
};
