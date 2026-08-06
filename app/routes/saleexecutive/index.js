module.exports = (app) => {
    require("./lead.routes")(app);
    require("./followup.routes")(app);
};