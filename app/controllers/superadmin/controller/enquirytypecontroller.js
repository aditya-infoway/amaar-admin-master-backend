const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createEnquiryType = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { enquiryTypeName, status } = req.body;

    // enquiryTypeName company-wise unique honi chahiye
    const nameExists = await selectWithJoins(
      "enquirytype",
      [],
      { enquiryTypeName: enquiryTypeName.trim(), companyId, delete: 0 },
      ["enquiryTypeId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Enquiry type already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      enquiryTypeName: enquiryTypeName.trim(),
      status,
      delete: 0,
    };

    const enquiryType = await saveModel("enquirytype", payload);

    return successResponse(res, enquiryType, "Enquiry type created successfully");
  } catch (error) {
    // DB level unique constraint bhi catch karo (race condition safety)
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Enquiry type already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getEnquiryTypeList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "enquirytype",
      [],
      { companyId, delete: 0 },
      ["enquiryTypeId", "companyId", "enquiryTypeName", "status", "created"],
      [["enquiryTypeId", "DESC"]]
    );

    return successResponse(res, list, "Enquiry type list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getEnquiryTypeById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "enquirytype",
      [],
      { enquiryTypeId: id, companyId, delete: 0 },
      ["enquiryTypeId", "companyId", "enquiryTypeName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Enquiry type not found");
    }

    return successResponse(res, rows[0], "Enquiry type fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateEnquiryType = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { enquiryTypeId, enquiryTypeName, status } = req.body;

    const existing = await selectWithJoins(
      "enquirytype",
      [],
      { enquiryTypeId, companyId, delete: 0 },
      ["enquiryTypeId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Enquiry type not found");
    }

    // enquiryTypeName uniqueness check — same record ke alawa koi aur is naam se na ho
    const nameExists = await selectWithJoins(
      "enquirytype",
      [],
      { enquiryTypeName: enquiryTypeName.trim(), companyId, delete: 0 },
      ["enquiryTypeId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.enquiryTypeId) !== String(enquiryTypeId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Enquiry type already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "enquirytype",
      {
        enquiryTypeName: enquiryTypeName.trim(),
        status,
        updated: new Date(),
      },
      { enquiryTypeId, companyId }
    );

    return successResponse(res, {}, "Enquiry type updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Enquiry type already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteEnquiryType = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { enquiryTypeId } = req.body;

    const existing = await selectWithJoins(
      "enquirytype",
      [],
      { enquiryTypeId, companyId, delete: 0 },
      ["enquiryTypeId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Enquiry type not found");
    }

    await updateModelHelper(
      "enquirytype",
      { delete: 1, updated: new Date() },
      { enquiryTypeId, companyId }
    );

    return successResponse(res, {}, "Enquiry type deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createEnquiryType,
  getEnquiryTypeList,
  getEnquiryTypeById,
  updateEnquiryType,
  deleteEnquiryType,
};