const { selectWithJoins, requiredmessage } = require("../helper/index.js");

const checkEmployeeToken = async (req, res, next) => {
  try {
    // API Token
    const apiToken = req.headers.apitoken;

    if (apiToken !== "2ed1b72407c91c22dc7bd2b729f67145") {
      return requiredmessage(res, "Invalid API Token");
    }

    // Login Token
    const token = req.headers["x-token"];

    if (!token) {
      return requiredmessage(res, "Token is required");
    }

    const employee = await selectWithJoins(
      "employee",
      [],
      {
        token,
        delete: 0,
      },
      ["companyId", "companyId", "employeeName", "email"]
    );

    if (employee.length === 0) {
      return requiredmessage(res, "Invalid or Expired Token");
    }

    // Future use ke liye req me store kar do
    req.employee = employee[0];

    next();
  } catch (err) {
    console.log(err);
    return requiredmessage(res, "Invalid Token");
  }
};

module.exports = {
  checkEmployeeToken,
};