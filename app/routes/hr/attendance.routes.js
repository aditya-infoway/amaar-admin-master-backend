const attendance = require("../../controllers/superadmin/controller/attendancecontroller.js");

const { employeeAuth } = require("../../helper/employeeAuth.js");

var routes = require("express").Router();

module.exports = (app) => {
  routes.use(employeeAuth);

  // ============================================================
  // ATTENDANCE LIST
  // ============================================================

  routes.get(
    "/list",
    attendance.getAttendanceList
  );

  // ============================================================
  // BASE ROUTE
  // ============================================================

  app.use(
    "/hr/attendance",
    routes
  );
};