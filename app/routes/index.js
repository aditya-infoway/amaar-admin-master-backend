module.exports = (app) => {
    require("./master")(app);
    require("./superadmin")(app);
    require("./security")(app);
};