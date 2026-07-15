const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createBodyType = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { bodyTypeName, status } = req.body;

    // bodyTypeName company-wise unique honi chahiye
    const nameExists = await selectWithJoins(
      "bodytype",
      [],
      { bodyTypeName: bodyTypeName.trim(), companyId, delete: 0 },
      ["bodyTypeId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Body type already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      bodyTypeName: bodyTypeName.trim(),
      status,
      delete: 0,
    };

    const bodyType = await saveModel("bodytype", payload);

    return successResponse(res, bodyType, "Body type created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Body type already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getBodyTypeList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "bodytype",
      [],
      { companyId, delete: 0 },
      ["bodyTypeId", "companyId", "bodyTypeName", "status", "created"],
      [["bodyTypeId", "DESC"]]
    );

    return successResponse(res, list, "Body type list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getBodyTypeById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "bodytype",
      [],
      { bodyTypeId: id, companyId, delete: 0 },
      ["bodyTypeId", "companyId", "bodyTypeName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Body type not found");
    }

    return successResponse(res, rows[0], "Body type fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateBodyType = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { bodyTypeId, bodyTypeName, status } = req.body;

    const existing = await selectWithJoins(
      "bodytype",
      [],
      { bodyTypeId, companyId, delete: 0 },
      ["bodyTypeId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Body type not found");
    }

    // bodyTypeName uniqueness check — same record ke alawa koi aur is naam se na ho
    const nameExists = await selectWithJoins(
      "bodytype",
      [],
      { bodyTypeName: bodyTypeName.trim(), companyId, delete: 0 },
      ["bodyTypeId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.bodyTypeId) !== String(bodyTypeId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Body type already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "bodytype",
      {
        bodyTypeName: bodyTypeName.trim(),
        status,
        updated: new Date(),
      },
      { bodyTypeId, companyId }
    );

    return successResponse(res, {}, "Body type updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Body type already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteBodyType = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { bodyTypeId } = req.body;

    const existing = await selectWithJoins(
      "bodytype",
      [],
      { bodyTypeId, companyId, delete: 0 },
      ["bodyTypeId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Body type not found");
    }

    await updateModelHelper(
      "bodytype",
      { delete: 1, updated: new Date() },
      { bodyTypeId, companyId }
    );

    return successResponse(res, {}, "Body type deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createBodyType,
  getBodyTypeList,
  getBodyTypeById,
  updateBodyType,
  deleteBodyType,
};