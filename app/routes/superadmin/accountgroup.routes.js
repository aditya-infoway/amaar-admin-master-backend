const { errorResponse } = require("../../helper/index.js");
const accountGroup = require("../../controllers/superadmin/controller/accountgroupcontroller.js");
const accountGroupValidation = require("../../controllers/superadmin/validator/accountgroupvalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        const message = error.details.map((i) => i.message).join(",");
        return errorResponse(res, message);
    }
    next();
};

module.exports = (app) => {
    routes.use(superAdminAuth);

    routes.post("/create", validate(accountGroupValidation.createAccountGroup), accountGroup.createAccountGroup);
    routes.get("/list", accountGroup.getAccountGroupList);
    routes.put("/update", validate(accountGroupValidation.updateAccountGroup), accountGroup.updateAccountGroup);
    routes.delete("/delete", validate(accountGroupValidation.deleteAccountGroup), accountGroup.deleteAccountGroup);

    app.use("/master/account-group", routes);
};