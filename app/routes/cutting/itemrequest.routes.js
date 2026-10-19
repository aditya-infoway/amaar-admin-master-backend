const controller = require("../../controllers/superadmin/controller/itemrequestcontroller.js");
const { employeeAuth } = require("../../helper/employeeAuth.js");

const DEPARTMENTS = [
  { path: "cutting", name: "Cutting" },
  { path: "welding", name: "Welding" },
  { path: "blasting", name: "Blasting" },
  { path: "paint", name: "Paint" },
  { path: "qc", name: "QC" },
];

module.exports = (app) => {
  DEPARTMENTS.forEach(({ path, name }) => {
    const routes = require("express").Router();

    routes.use(employeeAuth);
    routes.use((req, _res, next) => {
      req.department = name;
      next();
    });
    routes.get("/next-issue-no", controller.getNextIssueNo);
    routes.get("/items-by-workorder", controller.getItemsByWorkOrder);
    routes.get("/", controller.getDepartmentItemRequests);
    routes.post("/", controller.createItemRequest);

    app.use(`/${path}/itemrequest`, routes);
  });
};