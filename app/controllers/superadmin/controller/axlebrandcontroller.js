const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createAxleBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { axleBrandName, status } = req.body;

    const nameExists = await selectWithJoins(
      "axlebrand",
      [],
      { axleBrandName: axleBrandName.trim(), companyId, delete: 0 },
      ["axleBrandId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Axle brand already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      axleBrandName: axleBrandName.trim(),
      status,
      delete: 0,
    };

    const axleBrand = await saveModel("axlebrand", payload);

    return successResponse(res, axleBrand, "Axle brand created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Axle brand already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getAxleBrandList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "axlebrand",
      [],
      { companyId, delete: 0 },
      ["axleBrandId", "companyId", "axleBrandName", "status", "created"],
      [["axleBrandId", "DESC"]]
    );

    return successResponse(res, list, "Axle brand list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getAxleBrandById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "axlebrand",
      [],
      { axleBrandId: id, companyId, delete: 0 },
      ["axleBrandId", "companyId", "axleBrandName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Axle brand not found");
    }

    return successResponse(res, rows[0], "Axle brand fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateAxleBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { axleBrandId, axleBrandName, status } = req.body;

    const existing = await selectWithJoins(
      "axlebrand",
      [],
      { axleBrandId, companyId, delete: 0 },
      ["axleBrandId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Axle brand not found");
    }

    const nameExists = await selectWithJoins(
      "axlebrand",
      [],
      { axleBrandName: axleBrandName.trim(), companyId, delete: 0 },
      ["axleBrandId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.axleBrandId) !== String(axleBrandId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Axle brand already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "axlebrand",
      {
        axleBrandName: axleBrandName.trim(),
        status,
        updated: new Date(),
      },
      { axleBrandId, companyId }
    );

    return successResponse(res, {}, "Axle brand updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Axle brand already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteAxleBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { axleBrandId } = req.body;

    const existing = await selectWithJoins(
      "axlebrand",
      [],
      { axleBrandId, companyId, delete: 0 },
      ["axleBrandId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Axle brand not found");
    }

    await updateModelHelper(
      "axlebrand",
      { delete: 1, updated: new Date() },
      { axleBrandId, companyId }
    );

    return successResponse(res, {}, "Axle brand deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createAxleBrand,
  getAxleBrandList,
  getAxleBrandById,
  updateAxleBrand,
  deleteAxleBrand,
};