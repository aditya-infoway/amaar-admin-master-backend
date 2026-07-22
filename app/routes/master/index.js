module.exports = (app) => {
    require("./master.routes")(app);
    require("./company.routes")(app);
};