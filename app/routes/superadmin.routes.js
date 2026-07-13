const { errorResponse } = require("../helper/index.js");
const company = require("../controllers/superadmin/companycontroller.js");
const companyvalidation = require('../controllers/superadmin/companyvalidator.js');
const { checktoken } = require("../middleware/token.js");
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


module.exports = (app) => {
  routes.use(checktoken);
  routes.post("/login", validate(companyvalidation.companyLogin), company.companyLogin);

  app.use("/superadmin", routes);
};
