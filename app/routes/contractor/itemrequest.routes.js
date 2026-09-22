const itemRequest = require("../../controllers/superadmin/controller/itemrequestcontroller.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(employeeAuth);

  // Dropdown: assigned work orders
  routes.get("/workorders", itemRequest.getAssignedWorkOrders);

  // After selecting WO → get BOM items of that model
  routes.get("/items-by-workorder", itemRequest.getItemsByWorkOrder);

  // Submit request
  routes.post("/", itemRequest.createItemRequest);

  // Optional list
  routes.get("/list", itemRequest.getMyItemRequests);

  app.use("/contractor/itemrequest", routes);
};