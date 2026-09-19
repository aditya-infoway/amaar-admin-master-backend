const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
  validemail,
} = require("../../../helper/index.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");
const { getCompanyForMail } = require("../../../helper/purchaseOrderMail.js");
const {
  sendEmailOtp,
  verifyEmailOtp,
  isEmailVerified,
  clearVerifiedEmail,
} = require("../../../helper/emailOtp.js");

// ---------------- NEXT LEAD CODE (purchase ke bill-no jaisa hi) ----------------
const getNextLeadId = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(
        res,
        "Financial Year not found in session. Please select a company year.",
      );

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "lead",
      idColumn: "leadId",
      prefixFor: "LEAD",
    });

    // billNo hi frontend ko "leadCode" ke naam se jayega
    return successResponse(
      res,
      { leadCode: billNo, fyLabel, financialYearId },
      "Lead Code generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const sendLeadOtp = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const email = String(req.body.email || "").trim();
    if (!email) return errorResponse(res, "Email is required to send OTP.");
    if (!validemail(email)) return errorResponse(res, "Email is invalid.");

    const company = await getCompanyForMail(companyId);
    await sendEmailOtp({
      companyId,
      email,
      name: req.body.name,
      companyName: company.companyName,
    });

    return successResponse(res, {}, "OTP sent to email");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const verifyLeadOtp = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const email = String(req.body.email || "").trim();
    const otp = String(req.body.otp || "").trim();
    if (!email || !otp)
      return errorResponse(res, "Email and OTP are required.");

    const result = verifyEmailOtp({ companyId, email, otp });
    if (!result.ok) return errorResponse(res, result.message);

    return successResponse(res, {}, "OTP verified");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE ----------------
const createLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      leadCode,
      name,
      number,
      email,
      address,
      city,
      model,
      remark,
      nextFollowupDate,
      financialYearId,
      createdBy,
      createdType,
    } = req.body;

    const leadEmail = String(email || "").trim();
    if (!leadEmail || !isEmailVerified(companyId, leadEmail)) {
      return errorResponse(
        res,
        "Email is not verified. Please verify the OTP first.",
      );
    }

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
    clearVerifiedEmail(companyId, leadEmail);
    return successResponse(res, lead, "Enquiry created successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getLeadList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { role } = req.query;

    const branchId = req.branchId;
    const employeeId = req.employeeId;

    // base filter — company + not-deleted
    const where = { companyId, delete: 0 };

    if (role === "Super Admin") {
      // koi extra filter nahi — sara data dikhega
    } else if (role === "Branch") {
      if (!branchId) return requiredmessage(res, "Branch not found.");
      where.branchId = branchId;
    } else if (role === "Sale Executive") {
      if (!employeeId) return requiredmessage(res, "Employee not found.");
      where.createdBy = employeeId;
      where.createdType = "Sale Executive";
    }

    const list = await selectWithJoins(
      "lead",
      [],
      where,
      [
        "leadId",
        "leadCode",
        "name",
        "number",
        "email",
        "address",
        "city",
        "model",
        "remark",
        "nextFollowupDate",
        "createdBy",
        "createdType",
        "created",
      ],
      [["leadId", "DESC"]],
    );

    // ========================================================
    // GET MODEL NAMES
    // ========================================================

    const modelIds = list.map((item) => item.model).filter((id) => id);

    let modelMap = {};

    if (modelIds.length > 0) {
      try {
        const models = await selectWithJoins(
          "itemmaster",
          [],
          { itemId: modelIds },
          ["itemId", "itemName"],
        );

        modelMap = models.reduce((map, m) => {
          map[String(m.itemId)] = m.itemName || "";
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching models:", err.message);
      }
    }

    const data = list.map((item) => ({
      ...item,
      modelName: modelMap[String(item.model)] || "",
    }));

    return successResponse(res, data, "Enquiry list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getLeadById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params; // route param, DB column leadId
    const rows = await selectWithJoins(
      "lead",
      [],
      { leadId: id, companyId, delete: 0 },
      [
        "leadId",
        "leadCode",
        "name",
        "number",
        "email",
        "address",
        "city",
        "model",
        "remark",
        "nextFollowupDate",
        "createdBy",
        "createdType",
        "created",
      ],
    );

    if (rows.length === 0) return requiredmessage(res, "Enquiry not found");

    const lead = rows[0];

    let modelName = "";

    if (lead.model) {
      const modelRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: lead.model },
        ["itemId", "itemName"],
      );

      if (modelRows.length) {
        modelName = modelRows[0].itemName || "";
      }
    }

    return successResponse(
      res,
      { ...lead, modelName },
      "Enquiry fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      leadId,
      leadCode,
      name,
      number,
      email,
      address,
      city,
      model,
      remark,
      nextFollowupDate,
    } = req.body;

    const existing = await selectWithJoins(
      "lead",
      [],
      { leadId, companyId, delete: 0 },
      ["leadId"],
    );
    if (existing.length === 0) return requiredmessage(res, "Enquiry not found");

    const leadEmail = String(email || "").trim();
    if (!leadEmail || !isEmailVerified(companyId, leadEmail)) {
      return errorResponse(
        res,
        "Email is not verified. Please verify the OTP first.",
      );
    }

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
    clearVerifiedEmail(companyId, leadEmail);
    return successResponse(res, {}, "Enquiry updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { leadId } = req.body;
    const existing = await selectWithJoins(
      "lead",
      [],
      { leadId, companyId, delete: 0 },
      ["leadId"],
    );
    if (existing.length === 0) return requiredmessage(res, "Enquiry not found");

    await updateModelHelper(
      "lead",
      { delete: 1, updated: new Date() },
      { leadId, companyId },
    );
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
  sendLeadOtp,
  verifyLeadOtp,
};

