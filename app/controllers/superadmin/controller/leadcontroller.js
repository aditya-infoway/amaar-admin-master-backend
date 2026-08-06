const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

// ---------------- NEXT LEAD CODE (purchase ke bill-no jaisa hi) ----------------
const getNextLeadId = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found in session. Please select a company year.");

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "lead",
      idColumn: "leadId",
      fixedPrefix: "LD",
    });

    // billNo hi frontend ko "leadCode" ke naam se jayega
    return successResponse(res, { leadCode: billNo, fyLabel, financialYearId }, "Lead Code generated successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE ----------------
const createLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      leadCode, name, number, email, address, city, model, remark, nextFollowupDate, financialYearId,createdBy,createdType,
    } = req.body;

    const payload = {
      companyId,
      financialYearId: financialYearId || null,
      leadCode,
      name,
      number,
      email: email || null,
      address: address || null,
      city: city || null,
      model,
      remark: remark || null,
      nextFollowupDate,
      createdBy,
      createdType,
      delete: 0,
    };

    const lead = await saveModel("lead", payload);
    return successResponse(res, lead, "Enquiry created successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getLeadList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoins(
      "lead",
      [],
      { companyId, delete: 0 },
      [
        "leadId", "leadCode", "name", "number", "email", "address", "city",
        "model", "remark", "nextFollowupDate", "createdBy", "createdType", "created",
      ],
      [["leadId", "DESC"]]
    );

    return successResponse(res, list, "Enquiry list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getLeadById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params; // route param, DB column leadId
    const rows = await selectWithJoins(
      "lead",
      [],
      { leadId: id, companyId, delete: 0 },
      [
        "leadId", "leadCode", "name", "number", "email", "address", "city",
        "model", "remark", "nextFollowupDate", "createdBy", "createdType", "created",
      ]
    );

    if (rows.length === 0) return requiredmessage(res, "Enquiry not found");
    return successResponse(res, rows[0], "Enquiry fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      leadId, leadCode, name, number, email, address, city, model, remark, nextFollowupDate,
    } = req.body;

    const existing = await selectWithJoins("lead", [], { leadId, companyId, delete: 0 }, ["leadId"]);
    if (existing.length === 0) return requiredmessage(res, "Enquiry not found");

    const payload = {
      leadCode,
      name,
      number,
      email: email || null,
      address: address || null,
      city: city || null,
      model,
      remark: remark || null,
      nextFollowupDate,
      updated: new Date(),
    };

    await updateModelHelper("lead", payload, { leadId, companyId });
    return successResponse(res, {}, "Enquiry updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { leadId } = req.body;
    const existing = await selectWithJoins("lead", [], { leadId, companyId, delete: 0 }, ["leadId"]);
    if (existing.length === 0) return requiredmessage(res, "Enquiry not found");

    await updateModelHelper("lead", { delete: 1, updated: new Date() }, { leadId, companyId });
    return successResponse(res, {}, "Enquiry deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  getNextLeadId,
  createLead,
  getLeadList,
  getLeadById,
  updateLead,
  deleteLead,
};