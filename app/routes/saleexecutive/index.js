module.exports = (app) => {
    require("./lead.routes")(app);
    require("./followup.routes")(app);
    require("./quotation.routes")(app);
    require("./createmaster.routes")(app);
       require("./model.routes")(app);

};