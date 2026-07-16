const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createItemGroup = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { groupName, status } = req.body;

    // groupName company-wise unique honi chahiye
    const nameExists = await selectWithJoins(
      "itemgroup",
      [],
      { groupName: groupName.trim(), companyId, delete: 0 },
      ["itemGroupId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Item group already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      groupName: groupName.trim(),
      status,
      delete: 0,
    };

    const itemGroup = await saveModel("itemgroup", payload);

    return successResponse(res, itemGroup, "Item group created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Item group already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getItemGroupList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "itemgroup",
      [],
      { companyId, delete: 0 },
      ["itemGroupId", "companyId", "groupName", "status", "created"],
      [["itemGroupId", "DESC"]]
    );

    return successResponse(res, list, "Item group list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getItemGroupById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "itemgroup",
      [],
      { itemGroupId: id, companyId, delete: 0 },
      ["itemGroupId", "companyId", "groupName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Item group not found");
    }

    return successResponse(res, rows[0], "Item group fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateItemGroup = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { itemGroupId, groupName, status } = req.body;

    const existing = await selectWithJoins(
      "itemgroup",
      [],
      { itemGroupId, companyId, delete: 0 },
      ["itemGroupId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Item group not found");
    }

    // groupName uniqueness check — same record ke alawa koi aur is naam se na ho
    const nameExists = await selectWithJoins(
      "itemgroup",
      [],
      { groupName: groupName.trim(), companyId, delete: 0 },
      ["itemGroupId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.itemGroupId) !== String(itemGroupId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Item group already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "itemgroup",
      {
        groupName: groupName.trim(),
        status,
        updated: new Date(),
      },
      { itemGroupId, companyId }
    );

    return successResponse(res, {}, "Item group updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Item group already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteItemGroup = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { itemGroupId } = req.body;

    const existing = await selectWithJoins(
      "itemgroup",
      [],
      { itemGroupId, companyId, delete: 0 },
      ["itemGroupId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Item group not found");
    }

    await updateModelHelper(
      "itemgroup",
      { delete: 1, updated: new Date() },
      { itemGroupId, companyId }
    );

    return successResponse(res, {}, "Item group deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createItemGroup,
  getItemGroupList,
  getItemGroupById,
  updateItemGroup,
  deleteItemGroup,
};