// routes/superadmin/bodyRegister.routes.js

const { errorResponse } = require("../../helper/index.js");
const bodyRegister = require("../../controllers/superadmin/controller/bodyregistercontroller.js");
const bodyRegisterValidation = require("../../controllers/superadmin/validator/bodyregistervalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
        const message = error.details.map((i) => i.message).join(",");
        return errorResponse(res, message);
    }
    req.body = value;
    next();
};

module.exports = (app) => {
    routes.use(superAdminAuth);

    // Auto values for the drawer
    routes.get("/next", bodyRegister.getNextBodyRegister);

    // Save body register
    routes.post(
        "/create",
        validate(bodyRegisterValidation.createBodyRegister),
        bodyRegister.createBodyRegister,
    );

    app.use("/bodyregister", routes);
};