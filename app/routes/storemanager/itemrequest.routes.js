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
routes.post("/issue", itemRequest.issueItemRequestItem);
  // Optional list
  routes.get("/list", itemRequest.getMyItemRequests);
// Detail view (work order + items list for issuing)
routes.get("/:id", itemRequest.getItemRequestDetail);
  app.use("/storemanager/itemrequest", routes);
};