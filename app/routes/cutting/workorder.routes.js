const workOrder = require("../../controllers/superadmin/controller/workOrderController");
const { employeeAuth } = require("../../helper/employeeAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
    routes.use(employeeAuth);
    routes.get("/my-tasks", workOrder.getMyWorkOrderTasks);
    routes.post("/start", workOrder.startWorkOrderStage);
    app.use("/workordertask", routes);
};