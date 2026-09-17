module.exports = (app) => {
    require("./employee.routes")(app);
  require("./attendance.routes")(app);
};