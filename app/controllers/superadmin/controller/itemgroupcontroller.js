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

    const { groupName, itemCategoryId, status,createdBy, createdType } = req.body;

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

    const list = await selectWithJoins(
      "itemgroup",
      [],
      { companyId, delete: 0 },
      [
        "itemGroupId",
        "companyId",
        "groupName",
        "itemCategoryId",
        "status",
        "createdBy",     // 👈 add
        "createdType",   // 👈 add
        "created",
      ],
      [["itemGroupId", "DESC"]]
    );

    // createdBy resolve — company ho ya employee
    const createdByIds = [
      ...new Set((list || []).map((row) => row.createdBy).filter(Boolean)),
    ];

    let companyMap = {};
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
    }

    let employeeMap = {};
    if (createdByIds.length > 0) {
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

    const data = (list || []).map((row) => ({
      ...(row.toJSON ? row.toJSON() : row),
      createdBy: companyMap[String(row.createdBy)] || employeeMap[String(row.createdBy)] || row.createdBy,
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
      ["itemGroupId", "companyId", "groupName", "itemCategoryId", "status", "createdBy", "createdType", "created"] // 👈 add
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
      ["itemGroupId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Item group not found");
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