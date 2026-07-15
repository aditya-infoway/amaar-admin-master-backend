const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createTyreBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { tyreBrandName, status } = req.body;

    const nameExists = await selectWithJoins(
      "tyrebrand",
      [],
      { tyreBrandName: tyreBrandName.trim(), companyId, delete: 0 },
      ["tyreBrandId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Tyre brand already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      tyreBrandName: tyreBrandName.trim(),
      status,
      delete: 0,
    };

    const tyreBrand = await saveModel("tyrebrand", payload);

    return successResponse(res, tyreBrand, "Tyre brand created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Tyre brand already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getTyreBrandList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "tyrebrand",
      [],
      { companyId, delete: 0 },
      ["tyreBrandId", "companyId", "tyreBrandName", "status", "created"],
      [["tyreBrandId", "DESC"]]
    );

    return successResponse(res, list, "Tyre brand list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getTyreBrandById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "tyrebrand",
      [],
      { tyreBrandId: id, companyId, delete: 0 },
      ["tyreBrandId", "companyId", "tyreBrandName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Tyre brand not found");
    }

    return successResponse(res, rows[0], "Tyre brand fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateTyreBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { tyreBrandId, tyreBrandName, status } = req.body;

    const existing = await selectWithJoins(
      "tyrebrand",
      [],
      { tyreBrandId, companyId, delete: 0 },
      ["tyreBrandId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Tyre brand not found");
    }

    const nameExists = await selectWithJoins(
      "tyrebrand",
      [],
      { tyreBrandName: tyreBrandName.trim(), companyId, delete: 0 },
      ["tyreBrandId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.tyreBrandId) !== String(tyreBrandId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Tyre brand already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "tyrebrand",
      {
        tyreBrandName: tyreBrandName.trim(),
        status,
        updated: new Date(),
      },
      { tyreBrandId, companyId }
    );

    return successResponse(res, {}, "Tyre brand updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Tyre brand already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteTyreBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { tyreBrandId } = req.body;

    const existing = await selectWithJoins(
      "tyrebrand",
      [],
      { tyreBrandId, companyId, delete: 0 },
      ["tyreBrandId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Tyre brand not found");
    }

    await updateModelHelper(
      "tyrebrand",
      { delete: 1, updated: new Date() },
      { tyreBrandId, companyId }
    );

    return successResponse(res, {}, "Tyre brand deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createTyreBrand,
  getTyreBrandList,
  getTyreBrandById,
  updateTyreBrand,
  deleteTyreBrand,
};