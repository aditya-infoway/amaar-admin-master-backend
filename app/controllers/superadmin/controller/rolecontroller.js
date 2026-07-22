const {
  successResponse,
  errorResponse,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- LIST (department se filter, optional) ----------------
const getRoleList = async (req, res) => {
  try {
    const { department } = req.query;

    const where = { delete: 0 };
    if (department) {
      where.department = department;
    }

    const list = await selectWithJoins(
      "role",
      [],
      where,
      ["roleId", "department", "roleName"],
      [["roleId", "ASC"]]
    );

    return successResponse(res, list, "Role list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = { getRoleList };