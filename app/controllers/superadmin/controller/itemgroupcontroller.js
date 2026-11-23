const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

const { syncDefaultItemGroups } = require("./companydetailscontroller.js");

const ITEM_GROUP_FIELDS = [
  "itemGroupId",
  "companyId",
  "groupName",
  "itemCategoryId",
  "groupType",
  "status",
  "createdBy",
  "createdType",
  "created",
];


// ---- helper: createdBy (company ya employee) ka naam resolve ----
const resolveCreatedByName = async (createdByIds) => {
  let companyMap = {};
  let employeeMap = {};

  if (createdByIds.length > 0) {
    const companies = await selectWithJoins(
      "company",
      [],
      { companyId: createdByIds, delete: 0 },
      ["companyId", "companyName"]
    );
    companyMap = (companies || []).reduce((acc, item) => {
      acc[String(item.companyId)] = item.companyName;
      return acc;
    }, {});

    const employees = await selectWithJoins(
      "employee",
      [],
      { employeeId: createdByIds, delete: 0 },
      ["employeeId", "employeeName"]
    );
    employeeMap = (employees || []).reduce((acc, item) => {
      acc[String(item.employeeId)] = item.employeeName;
      return acc;
    }, {});
  }

  return { companyMap, employeeMap };
};

// ---------------- CREATE ----------------
const createItemGroup = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { groupName, itemCategoryId, status, createdBy, createdType } = req.body;

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
      itemCategoryId,
      groupType: "manual",
      createdBy,
      createdType,
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

    // default groups (Tipper, Trailer) ensure karo — fail ho to bhi list chale
    try {
      await syncDefaultItemGroups(companyId);
    } catch (syncError) {
      console.log("syncDefaultItemGroups failed:", syncError?.message);
    }

    const list = await selectWithJoins(
      "itemgroup",
      [],
      { companyId, delete: 0 },
      ITEM_GROUP_FIELDS,
      [["itemGroupId", "DESC"]]
    );

    const createdByIds = [
      ...new Set((list || []).map((row) => row.createdBy).filter(Boolean)),
    ];
    const { companyMap, employeeMap } = await resolveCreatedByName(createdByIds);

    const data = (list || []).map((row) => ({
      ...(row.toJSON ? row.toJSON() : row),
      createdBy:
        companyMap[String(row.createdBy)] ||
        employeeMap[String(row.createdBy)] ||
        row.createdBy,
    }));

    return successResponse(res, data, "Item group list fetched successfully");
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
      ITEM_GROUP_FIELDS
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Item group not found");
    }

    const groupRow = rows[0].toJSON ? rows[0].toJSON() : rows[0];

    if (groupRow.createdBy) {
      const companyRows = await selectWithJoins(
        "company",
        [],
        { companyId: groupRow.createdBy, delete: 0 },
        ["companyId", "companyName"]
      );
      if (companyRows.length > 0) {
        groupRow.createdBy = companyRows[0].companyName;
      } else {
        const employeeRows = await selectWithJoins(
          "employee",
          [],
          { employeeId: groupRow.createdBy, delete: 0 },
          ["employeeId", "employeeName"]
        );
        if (employeeRows.length > 0) {
          groupRow.createdBy = employeeRows[0].employeeName;
        }
      }
    }

    return successResponse(res, groupRow, "Item group fetched successfully");
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

    const { itemGroupId, groupName, itemCategoryId, status } = req.body;

    const existing = await selectWithJoins(
      "itemgroup",
      [],
      { itemGroupId, companyId, delete: 0 },
      ["itemGroupId", "groupName", "groupType", "itemCategoryId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Item group not found");
    }

    // default group ka naam change nahi hoga (warna sync dobara bana dega)
    const isDefault = String(existing[0].groupType || "").toLowerCase() === "default";

    if (isDefault) {
      if (
        String(existing[0].groupName).trim().toLowerCase() !==
        String(groupName || "").trim().toLowerCase()
      ) {
        return errorResponse(res, "Default item group name cannot be changed.");
      }
      if (String(existing[0].itemCategoryId) !== String(itemCategoryId)) {
        return errorResponse(res, "Default item group category cannot be changed.");
      }
    }

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
        itemCategoryId,
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
      ["itemGroupId", "groupType"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Item group not found");
    }

    if (String(existing[0].groupType || "").toLowerCase() === "default") {
      return errorResponse(res, "Default item group cannot be deleted.");
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