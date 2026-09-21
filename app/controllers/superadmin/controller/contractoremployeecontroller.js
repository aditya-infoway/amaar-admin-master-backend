const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ============================================================
// CONSTANTS / HELPERS
// ============================================================

// Same group ids your existing Supplier list API uses (getSupplierAccountList).
// Confirm with: SELECT id, "groupName" FROM "group" WHERE id IN (30, 34);
const SUNDRY_CREDITOR_GROUP_IDS = [30];

const UPLOAD_PATH = "/Uploadimages/contractor_employee";

const EMPLOYEE_COLUMNS = [
  "contractorEmployeeId",
  "companyId",
  "partyId",
  "employeeName",
  "employeeNo",
  "email",
  "address",
  "aadharNumber",
  "aadharImage",
  "panNumber",
  "panImage",
  "created",
  "updated",
];

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

// Path of a freshly uploaded file, or the fallback (existing saved path / null)
const uploadedPath = (req, field, fallback = null) =>
  req.files?.[field]?.[0]
    ? `${UPLOAD_PATH}/${req.files[field][0].filename}`
    : fallback;

// A card number must come with its image (same rule as the frontend)
const kycError = ({ aadharNumber, aadharImage, panNumber, panImage }) => {
  if (aadharNumber && !aadharImage) return "Upload Aadhar card image.";
  if (panNumber && !panImage) return "Upload PAN card image.";
  return null;
};

// The party must be an account of THIS company, in a Sundry Creditor group
const getSundryCreditorParty = async (partyId, companyId) => {
  const id = normalizeId(partyId);
  if (!id) return null;

  const rows = await selectWithJoins(
    "account",
    [],
    {
      id,
      companyId,
      groupId: SUNDRY_CREDITOR_GROUP_IDS,
      delete: 0,
    },
    ["id", "accountName"]
  );

  return rows[0] || null;
};

// One lookup for all rows (avoids selectWithJoinsV2 + array where-clauses)
const buildPartyMap = async (partyIds, companyId) => {
  const ids = [...new Set(partyIds.filter(Boolean))];
  if (!ids.length) return {};

  const parties = await selectWithJoins(
    "account",
    [],
    { id: ids, companyId },
    ["id", "accountName"]
  );

  return parties.reduce((map, party) => {
    map[String(party.id)] = party.accountName || "";
    return map;
  }, {});
};

const formatEmployee = (row, partyMap) => ({
  id: String(row.contractorEmployeeId),
  partyId: String(row.partyId),
  partyName: partyMap[String(row.partyId)] || "",
  employeeName: row.employeeName || "",
  employeeNo: row.employeeNo || "",
  email: row.email || "",
  address: row.address || "",
  aadharNumber: row.aadharNumber || "",
  aadharImage: row.aadharImage || "",
  panNumber: row.panNumber || "",
  panImage: row.panImage || "",
  createdAt: row.created,
  updatedAt: row.updated,
});

const cleanText = (value) => (value ? String(value).trim() : "");

// ============================================================
// CREATE
// ============================================================

const createContractorEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { partyId, employeeName, employeeNo, email, address, aadharNumber, panNumber } =
      req.body;

    const party = await getSundryCreditorParty(partyId, companyId);
    if (!party) {
      return errorResponse(res, "Selected party is not a Sundry Creditor account.");
    }

    const cleanEmployeeNo = cleanText(employeeNo);

    // Employee number must be unique within the company
    const duplicate = await selectWithJoins(
      "contractoremployee",
      [],
      { companyId, employeeNo: cleanEmployeeNo, delete: 0 },
      ["contractorEmployeeId"]
    );

    if (duplicate.length > 0) {
      return errorResponse(res, `Employee number ${cleanEmployeeNo} already exists.`);
    }

    const aadharImage = uploadedPath(req, "aadharImage");
    const panImage = uploadedPath(req, "panImage");

    const cleanAadhar = cleanText(aadharNumber);
    const cleanPan = cleanText(panNumber).toUpperCase();

    const kycMessage = kycError({
      aadharNumber: cleanAadhar,
      aadharImage,
      panNumber: cleanPan,
      panImage,
    });
    if (kycMessage) return errorResponse(res, kycMessage);

    const employee = await saveModel("contractoremployee", {
      companyId,
      partyId: party.id,
      employeeName: cleanText(employeeName),
      employeeNo: cleanEmployeeNo,
      email: cleanText(email),
      address: cleanText(address),
      aadharNumber: cleanAadhar || null,
      aadharImage,
      panNumber: cleanPan || null,
      panImage,
      delete: 0,
    });

    return successResponse(
      res,
      {
        contractorEmployeeId: employee.contractorEmployeeId,
        employeeNo: cleanEmployeeNo,
      },
      "Employee saved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// LIST
// ============================================================

const getContractorEmployeeList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const rows = await selectWithJoins(
      "contractoremployee",
      [],
      { companyId, delete: 0 },
      EMPLOYEE_COLUMNS,
      [["contractorEmployeeId", "DESC"]]
    );

    const partyMap = await buildPartyMap(
      rows.map((row) => row.partyId),
      companyId
    );

    return successResponse(
      res,
      rows.map((row) => formatEmployee(row, partyMap)),
      "Employee list fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET BY ID
// ============================================================

const getContractorEmployeeById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const id = normalizeId(req.params.id);
    if (!id) return errorResponse(res, "Employee id is required.");

    const rows = await selectWithJoins(
      "contractoremployee",
      [],
      { contractorEmployeeId: id, companyId, delete: 0 },
      EMPLOYEE_COLUMNS
    );

    if (!rows.length) return requiredmessage(res, "Employee not found.");

    const partyMap = await buildPartyMap([rows[0].partyId], companyId);

    return successResponse(
      res,
      formatEmployee(rows[0], partyMap),
      "Employee fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// UPDATE
// ============================================================

const updateContractorEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const id = normalizeId(req.params.id);
    if (!id) return errorResponse(res, "Employee id is required.");

    const existingRows = await selectWithJoins(
      "contractoremployee",
      [],
      { contractorEmployeeId: id, companyId, delete: 0 },
      ["contractorEmployeeId", "aadharImage", "panImage"]
    );

    if (!existingRows.length) return requiredmessage(res, "Employee not found.");

    const existing = existingRows[0];

    const { partyId, employeeName, employeeNo, email, address, aadharNumber, panNumber } =
      req.body;

    const party = await getSundryCreditorParty(partyId, companyId);
    if (!party) {
      return errorResponse(res, "Selected party is not a Sundry Creditor account.");
    }

    const cleanEmployeeNo = cleanText(employeeNo);

    const duplicate = await selectWithJoins(
      "contractoremployee",
      [],
      { companyId, employeeNo: cleanEmployeeNo, delete: 0 },
      ["contractorEmployeeId"]
    );

    const takenByAnother = duplicate.some(
      (row) => String(row.contractorEmployeeId) !== String(id)
    );

    if (takenByAnother) {
      return errorResponse(res, `Employee number ${cleanEmployeeNo} already exists.`);
    }

    // Keep the saved image unless a new one was uploaded
    const aadharImage = uploadedPath(req, "aadharImage", existing.aadharImage || null);
    const panImage = uploadedPath(req, "panImage", existing.panImage || null);

    const cleanAadhar = cleanText(aadharNumber);
    const cleanPan = cleanText(panNumber).toUpperCase();

    const kycMessage = kycError({
      aadharNumber: cleanAadhar,
      aadharImage,
      panNumber: cleanPan,
      panImage,
    });
    if (kycMessage) return errorResponse(res, kycMessage);

    await updateModelHelper(
      "contractoremployee",
      {
        partyId: party.id,
        employeeName: cleanText(employeeName),
        employeeNo: cleanEmployeeNo,
        email: cleanText(email),
        address: cleanText(address),
        aadharNumber: cleanAadhar || null,
        aadharImage,
        panNumber: cleanPan || null,
        panImage,
        updated: new Date(),
      },
      { contractorEmployeeId: id, companyId, delete: 0 }
    );

    return successResponse(
      res,
      { contractorEmployeeId: id, employeeNo: cleanEmployeeNo },
      "Employee updated successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// DELETE (soft delete)
// ============================================================

const deleteContractorEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const id = normalizeId(req.params.id);
    if (!id) return errorResponse(res, "Employee id is required.");

    const existing = await selectWithJoins(
      "contractoremployee",
      [],
      { contractorEmployeeId: id, companyId, delete: 0 },
      ["contractorEmployeeId", "employeeNo"]
    );

    if (!existing.length) return requiredmessage(res, "Employee not found.");

    await updateModelHelper(
      "contractoremployee",
      { delete: 1, updated: new Date() },
      { contractorEmployeeId: id, companyId }
    );

    return successResponse(
      res,
      { contractorEmployeeId: id, employeeNo: existing[0].employeeNo },
      "Employee deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};




// ============================================================
// PARTY LIST (dropdown) — Sundry Creditor accounts only
// ============================================================

const getPartyList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const parties = await selectWithJoins(
      "account",
      [],
      { companyId, groupId: SUNDRY_CREDITOR_GROUP_IDS, delete: 0 },
      ["id", "accountName"],
      [["accountName", "ASC"]]
    );

    return successResponse(
      res,
      parties.map((party) => ({
        id: String(party.id),
        accountName: party.accountName || "",
      })),
      "Party list fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  createContractorEmployee,
  getContractorEmployeeList,
  getContractorEmployeeById,
  updateContractorEmployee,
  deleteContractorEmployee,
  getPartyList,
};