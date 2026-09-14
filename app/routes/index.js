module.exports = (app) => {
    require("./master")(app);
    require("./superadmin")(app);
    require("./security")(app);
    require("./saleexecutive")(app);
      require("./hr")(app);
    require("./employeereusable.routes.js")(app);
};