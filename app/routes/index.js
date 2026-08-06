module.exports = (app) => {
    require("./master")(app);
    require("./superadmin")(app);
    require("./security")(app);
    require("./saleexecutive")(app);
    require("./employeereusable.routes.js")(app);
};