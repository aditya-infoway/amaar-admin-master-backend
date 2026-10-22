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

const getSupplierGroupList = async (req, res) => {
  try {
    const list = await selectWithJoins(
      "group",
      [],
      { delete: 0 },
      ["id", "groupName", "role"],
      [["groupName", "ASC"]]
    );

    const data = list.filter((g) => [30, 34].includes(Number(g.id)));

    return successResponse(res, data, "Supplier group list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// Sales Order ke Party ke liye: sirf Sundry Debtors (31) & Customer (35)
const getCustomerGroupList = async (req, res) => {
  try {
    const list = await selectWithJoins(
      "group",
      [],
      { delete: 0 },
      ["id", "groupName", "role"],
      [["groupName", "ASC"]]
    );

    const data = list.filter((g) => [31, 35].includes(Number(g.id)));

    return successResponse(res, data, "Customer group list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = { getGroupList, getSupplierGroupList, getCustomerGroupList };