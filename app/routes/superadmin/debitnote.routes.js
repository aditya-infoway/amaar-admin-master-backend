const { errorResponse } = require("../../helper/index.js");
const debitNote = require("../../controllers/superadmin/controller/debitnotecontroller.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");
// const debitNoteValidation = require("../../controllers/superadmin/validator/debitnotevalidator.js");

var routes = require("express").Router();

// const validate = (schema) => (req, res, next) => {
//   const { error } = schema.validate(req.body);
//   if (error) return errorResponse(res, error.details.map((i) => i.message).join(","));
//   next();
// };

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.get("/vendors", debitNote.getVendorSummary); // page 1
  routes.get("/vendor/:vendorId/:type", debitNote.getVendorDocs); // page 2
  routes.get("/next-debit-note-no", debitNote.getNextDebitNoteNo); // page 3
  routes.get("/source/:type/:id", debitNote.getDebitNoteSource); // page 3 auto-fill

  routes.post("/create", debitNote.createDebitNote);
  // routes.post("/create", validate(debitNoteValidation.createDebitNote), debitNote.createDebitNote);

  app.use("/debit-note", routes);
};