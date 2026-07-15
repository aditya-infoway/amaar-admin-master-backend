const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createHydraulicBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { hydraulicBrandName, status } = req.body;

    const nameExists = await selectWithJoins(
      "hydraulicbrand",
      [],
      { hydraulicBrandName: hydraulicBrandName.trim(), companyId, delete: 0 },
      ["hydraulicBrandId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Hydraulic brand already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      hydraulicBrandName: hydraulicBrandName.trim(),
      status,
      delete: 0,
    };

    const hydraulicBrand = await saveModel("hydraulicbrand", payload);

    return successResponse(res, hydraulicBrand, "Hydraulic brand created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Hydraulic brand already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getHydraulicBrandList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "hydraulicbrand",
      [],
      { companyId, delete: 0 },
      ["hydraulicBrandId", "companyId", "hydraulicBrandName", "status", "created"],
      [["hydraulicBrandId", "DESC"]]
    );

    return successResponse(res, list, "Hydraulic brand list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getHydraulicBrandById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "hydraulicbrand",
      [],
      { hydraulicBrandId: id, companyId, delete: 0 },
      ["hydraulicBrandId", "companyId", "hydraulicBrandName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Hydraulic brand not found");
    }

    return successResponse(res, rows[0], "Hydraulic brand fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateHydraulicBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { hydraulicBrandId, hydraulicBrandName, status } = req.body;

    const existing = await selectWithJoins(
      "hydraulicbrand",
      [],
      { hydraulicBrandId, companyId, delete: 0 },
      ["hydraulicBrandId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Hydraulic brand not found");
    }

    const nameExists = await selectWithJoins(
      "hydraulicbrand",
      [],
      { hydraulicBrandName: hydraulicBrandName.trim(), companyId, delete: 0 },
      ["hydraulicBrandId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.hydraulicBrandId) !== String(hydraulicBrandId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Hydraulic brand already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "hydraulicbrand",
      {
        hydraulicBrandName: hydraulicBrandName.trim(),
        status,
        updated: new Date(),
      },
      { hydraulicBrandId, companyId }
    );

    return successResponse(res, {}, "Hydraulic brand updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Hydraulic brand already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteHydraulicBrand = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { hydraulicBrandId } = req.body;

    const existing = await selectWithJoins(
      "hydraulicbrand",
      [],
      { hydraulicBrandId, companyId, delete: 0 },
      ["hydraulicBrandId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Hydraulic brand not found");
    }

    await updateModelHelper(
      "hydraulicbrand",
      { delete: 1, updated: new Date() },
      { hydraulicBrandId, companyId }
    );

    return successResponse(res, {}, "Hydraulic brand deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createHydraulicBrand,
  getHydraulicBrandList,
  getHydraulicBrandById,
  updateHydraulicBrand,
  deleteHydraulicBrand,
};