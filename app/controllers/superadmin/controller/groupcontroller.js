const { successResponse, errorResponse, selectWithJoins } = require("../../../helper/index.js");

const getGroupList = async (req, res) => {
  try {
    const list = await selectWithJoins(
      "group",
      [],
      { delete: 0 },
      ["id", "groupName", "role"],
      [["groupName", "ASC"]]
    );

    return successResponse(res, list, "Group list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = { getGroupList };