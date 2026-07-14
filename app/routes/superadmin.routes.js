const { errorResponse } = require("../helper/index.js");
const company = require("../controllers/superadmin/controller/companycontroller.js");
const companyDetails = require("../controllers/superadmin/controller/companydetailscontroller.js");
const companyvalidation = require('../controllers/superadmin/validator/companyvalidator.js');
const { companyDetailsSchema, companyDetailsUpdateSchema } = require("../controllers/superadmin/validator/companydetailsvalidator.js");
const { checktoken } = require("../middleware/token.js");
const { createUploader } = require("../middleware/upload.js");
const multer = require("multer");
const { log } = require("console");
const md5 = require("md5");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    console.log("error", message);
    errorResponse(res, message);
  } else {
    next();
  }
};

// 👇 YE LINE ZARURI HAI — logoUpload yahan define hona chahiye, module.exports se PEHLE
const logoUpload = createUploader("company_logo");

module.exports = (app) => {
  routes.use(checktoken);
  routes.post("/login", validate(companyvalidation.companyLogin), company.companyLogin);

  routes.post("/company-details/create", validate(companyDetailsSchema), companyDetails.createCompanyDetails);

  routes.post(
    "/company-details/update",
    logoUpload.single("logo"),
    validate(companyDetailsUpdateSchema),
    companyDetails.updateCompanyDetails
  );

  routes.get("/financial-years", companyDetails.getFinancialYears);
  routes.get("/company-details", companyDetails.getCompanyDetails);

  app.use("/superadmin", routes);
};