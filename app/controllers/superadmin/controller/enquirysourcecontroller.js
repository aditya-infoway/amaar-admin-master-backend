const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createEnquirySource = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { sourceName, status } = req.body;

    // sourceName company-wise unique honi chahiye
    const nameExists = await selectWithJoins(
      "enquirysource",
      [],
      { sourceName: sourceName.trim(), companyId, delete: 0 },
      ["enquirySourceId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Enquiry source already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      sourceName: sourceName.trim(),
      status,
      delete: 0,
    };

    const enquirySource = await saveModel("enquirysource", payload);

    return successResponse(res, enquirySource, "Enquiry source created successfully");
  } catch (error) {
    // DB level unique constraint bhi catch karo (race condition safety)
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Enquiry source already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getEnquirySourceList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "enquirysource",
      [],
      { companyId, delete: 0 },
      ["enquirySourceId", "companyId", "sourceName", "status", "created"],
      [["enquirySourceId", "DESC"]]
    );

    return successResponse(res, list, "Enquiry source list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getEnquirySourceById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "enquirysource",
      [],
      { enquirySourceId: id, companyId, delete: 0 },
      ["enquirySourceId", "companyId", "sourceName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Enquiry source not found");
    }

    return successResponse(res, rows[0], "Enquiry source fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateEnquirySource = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { enquirySourceId, sourceName, status } = req.body;

    const existing = await selectWithJoins(
      "enquirysource",
      [],
      { enquirySourceId, companyId, delete: 0 },
      ["enquirySourceId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Enquiry source not found");
    }

    // sourceName uniqueness check — same record ke alawa koi aur is naam se na ho
    const nameExists = await selectWithJoins(
      "enquirysource",
      [],
      { sourceName: sourceName.trim(), companyId, delete: 0 },
      ["enquirySourceId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.enquirySourceId) !== String(enquirySourceId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Enquiry source already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "enquirysource",
      {
        sourceName: sourceName.trim(),
        status,
        updated: new Date(),
      },
      { enquirySourceId, companyId }
    );

    return successResponse(res, {}, "Enquiry source updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Enquiry source already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteEnquirySource = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { enquirySourceId } = req.body;

    const existing = await selectWithJoins(
      "enquirysource",
      [],
      { enquirySourceId, companyId, delete: 0 },
      ["enquirySourceId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Enquiry source not found");
    }

    await updateModelHelper(
      "enquirysource",
      { delete: 1, updated: new Date() },
      { enquirySourceId, companyId }
    );

    return successResponse(res, {}, "Enquiry source deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createEnquirySource,
  getEnquirySourceList,
  getEnquirySourceById,
  updateEnquirySource,
  deleteEnquirySource,
};