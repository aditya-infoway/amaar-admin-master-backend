const { errorResponse } = require("../helper/index.js");
const master = require("../controllers/master/mastercontroller.js");
const mastervalidation = require('../controllers/master/mastervalidator.js');
const { checktoken } = require("../middleware/token.js");
const multer = require("multer");
const { log } = require("console");
const md5 = require("md5");

// console.log(md5("fox#123"));

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
  routes.post("/login", validate(mastervalidation.login), master.login);
  routes.post("/otp-verification", validate(mastervalidation.otpVerification), master.otpVerification);
  routes.post("/resend-otp", validate(mastervalidation.resendOtp), master.resendOtp);

  app.use("/master", routes);
};
