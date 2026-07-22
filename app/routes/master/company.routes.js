const { errorResponse } = require("../../helper/index.js");
const company = require("../../controllers/master/companycontroller.js");
const companyvalidation = require("../../controllers/master/companyvalidator.js");
const { checktoken } = require("../../middleware/authToken.js");

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

module.exports = (app) => {
  routes.use(checktoken); // same apitoken header check jo master.routes.js me hai

  routes.post(
    "/create",
    validate(companyvalidation.createCompany),
    company.createCompany
  );

  routes.get("/list", company.getCompanyList);


  app.use("/master/company", routes);
};