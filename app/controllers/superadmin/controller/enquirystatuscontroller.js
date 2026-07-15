const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createEnquiryStatus = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { statusName, status } = req.body;

    // statusName company-wise unique honi chahiye
    const nameExists = await selectWithJoins(
      "enquirystatus",
      [],
      { statusName: statusName.trim(), companyId, delete: 0 },
      ["enquiryStatusId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Enquiry status already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      statusName: statusName.trim(),
      status,
      delete: 0,
    };

    const enquiryStatus = await saveModel("enquirystatus", payload);

    return successResponse(res, enquiryStatus, "Enquiry status created successfully");
  } catch (error) {
    // DB level unique constraint bhi catch karo (race condition safety)
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Enquiry status already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getEnquiryStatusList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "enquirystatus",
      [],
      { companyId, delete: 0 },
      ["enquiryStatusId", "companyId", "statusName", "status", "created"],
      [["enquiryStatusId", "DESC"]]
    );

    return successResponse(res, list, "Enquiry status list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getEnquiryStatusById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "enquirystatus",
      [],
      { enquiryStatusId: id, companyId, delete: 0 },
      ["enquiryStatusId", "companyId", "statusName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Enquiry status not found");
    }

    return successResponse(res, rows[0], "Enquiry status fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateEnquiryStatus = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { enquiryStatusId, statusName, status } = req.body;

    const existing = await selectWithJoins(
      "enquirystatus",
      [],
      { enquiryStatusId, companyId, delete: 0 },
      ["enquiryStatusId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Enquiry status not found");
    }

    // statusName uniqueness check — same record ke alawa koi aur is naam se na ho
    const nameExists = await selectWithJoins(
      "enquirystatus",
      [],
      { statusName: statusName.trim(), companyId, delete: 0 },
      ["enquiryStatusId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.enquiryStatusId) !== String(enquiryStatusId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Enquiry status already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "enquirystatus",
      {
        statusName: statusName.trim(),
        status,
        updated: new Date(),
      },
      { enquiryStatusId, companyId }
    );

    return successResponse(res, {}, "Enquiry status updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Enquiry status already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteEnquiryStatus = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { enquiryStatusId } = req.body;

    const existing = await selectWithJoins(
      "enquirystatus",
      [],
      { enquiryStatusId, companyId, delete: 0 },
      ["enquiryStatusId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Enquiry status not found");
    }

    await updateModelHelper(
      "enquirystatus",
      { delete: 1, updated: new Date() },
      { enquiryStatusId, companyId }
    );

    return successResponse(res, {}, "Enquiry status deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createEnquiryStatus,
  getEnquiryStatusList,
  getEnquiryStatusById,
  updateEnquiryStatus,
  deleteEnquiryStatus,
};