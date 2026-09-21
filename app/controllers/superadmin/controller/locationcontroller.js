 const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createLocation = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { locationCode, locationName, status, createdBy, createdType } = req.body;

    // Check locationCode unique
    const codeExists = await selectWithJoins(
      "location",
      [],
      { locationCode: locationCode.trim(), companyId, delete: 0 },
      ["locationId"]
    );

    if (codeExists.length > 0) {
      return errorResponse(res, "Location code already exists. Please enter a different code.");
    }

    // Check locationName unique
    const nameExists = await selectWithJoins(
      "location",
      [],
      { locationName: locationName.trim(), companyId, delete: 0 },
      ["locationId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Location name already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      locationCode: locationCode.trim(),
      locationName: locationName.trim(),
      status: status || "active",
        createdBy,     
  createdType,
      delete: 0,
    };

    const location = await saveModel("location", payload);

    return successResponse(res, location, "Location created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Location code or name already exists.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getLocationList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "location",
      [],
      { companyId, delete: 0 },
      ["locationId", "companyId", "locationCode", "locationName", "status", "createdBy", "createdType", "created"], 
      [["locationId", "DESC"]]
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

    return successResponse(res, data, "Location list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getLocationById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "location",
      [],
      { locationId: id, companyId, delete: 0 },
      ["locationId", "companyId", "locationCode", "locationName", "status", "createdBy", "createdType", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Location not found");
    }

    const locationRow = rows[0].toJSON ? rows[0].toJSON() : rows[0];

    if (locationRow.createdBy) {
      const companyRows = await selectWithJoins(
        "company",
        [],
        { companyId: locationRow.createdBy, delete: 0 },
        ["companyId", "companyName"]
      );
      if (companyRows.length > 0) {
        locationRow.createdBy = companyRows[0].companyName;
      } else {
        const employeeRows = await selectWithJoins(
          "employee",
          [],
          { employeeId: locationRow.createdBy, delete: 0 },
          ["employeeId", "employeeName"]
        );
        if (employeeRows.length > 0) {
          locationRow.createdBy = employeeRows[0].employeeName;
        }
      }
    }

    return successResponse(res, locationRow, "Location fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateLocation = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { locationId, locationCode, locationName, status } = req.body;

    const existing = await selectWithJoins(
      "location",
      [],
      { locationId, companyId, delete: 0 },
      ["locationId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Location not found");
    }

    // Check locationCode unique (exclude current record)
    const codeExists = await selectWithJoins(
      "location",
      [],
      { locationCode: locationCode.trim(), companyId, delete: 0 },
      ["locationId"]
    );

    const codeTakenByOther = codeExists.some(
      (row) => String(row.locationId) !== String(locationId)
    );

    if (codeTakenByOther) {
      return errorResponse(res, "Location code already exists. Please enter a different code.");
    }

    // Check locationName unique (exclude current record)
    const nameExists = await selectWithJoins(
      "location",
      [],
      { locationName: locationName.trim(), companyId, delete: 0 },
      ["locationId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.locationId) !== String(locationId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Location name already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "location",
      {
        locationCode: locationCode.trim(),
        locationName: locationName.trim(),
        status,
        updated: new Date(),
      },
      { locationId, companyId }
    );

    return successResponse(res, {}, "Location updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Location code or name already exists.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteLocation = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { locationId } = req.body;

    const existing = await selectWithJoins(
      "location",
      [],
      { locationId, companyId, delete: 0 },
      ["locationId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Location not found");
    }

    await updateModelHelper(
      "location",
      { delete: 1, updated: new Date() },
      { locationId, companyId }
    );

    return successResponse(res, {}, "Location deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createLocation,
  getLocationList,
  getLocationById,
  updateLocation,
  deleteLocation,
};