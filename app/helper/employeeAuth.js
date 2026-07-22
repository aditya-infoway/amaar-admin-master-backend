const { checkEmployeeToken } = require("../middleware/employeeToken");

const employeeAuth = async (req, res, next) => {
  try {
    // API Token
    const apiToken = req.headers.apitoken;

    if (apiToken !== "2ed1b72407c91c22dc7bd2b729f67145") {
      return res.status(401).json({
        status: 401,
        message: "Invalid API Token",
      });
    }

    // Login Token
    const token = req.headers["x-token"];

    if (!token) {
      return res.status(401).json({
        status: 401,
        message: "Token Missing",
      });
    }

    const employeeRows = await checkEmployeeToken(token);

    if (!employeeRows.length) {
      return res.status(401).json({
        status: 401,
        message: "Invalid Token",
      });
    }

    req.employee = employeeRows[0];
    req.companyId = employeeRows[0].companyId;
    req.employeeId = employeeRows[0].employeeId;

    next();
  } catch (err) {
    return res.status(401).json({
      status: 401,
      message: err.message,
    });
  }
};

module.exports = { employeeAuth };