module.exports = (app) => {
    require("./vehicleentry.routes")(app);
    require("./visitorentry.routes")(app);
};