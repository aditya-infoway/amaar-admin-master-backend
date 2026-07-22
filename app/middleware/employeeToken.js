const { selectWithJoins } = require("../helper/index.js");

const checkEmployeeToken = async (token) => {
  return await selectWithJoins(
    "employee",
    [],
    {
      token,
      delete: 0,
    },
    ["companyId", "employeeId", "employeeName", "email"]
  );
};

module.exports = {
  checkEmployeeToken,
};