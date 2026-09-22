

const workOrder = require("../../controllers/superadmin/controller/workOrderController.js");

const { employeeAuth } = require("../../helper/employeeAuth.js");

var routes = require("express").Router();



module.exports = (app) => {
    routes.use(employeeAuth);

    routes.get("/list", workOrder.getWorkOrderList);

    routes.get("/:id", workOrder.getWorkOrderById);

    app.use("/contractoremployee/workorder", routes);
};