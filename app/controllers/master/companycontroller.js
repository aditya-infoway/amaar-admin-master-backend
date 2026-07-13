const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  errorResponse,
  successResponse,
  requiredmessage,
  selectWithJoins,
  saveModel,
  updateModel,
} = require("../../helper/index.js");

// generic uniqueness check against company table
const isFieldTaken = async (field, value) => {
  if (!value) return false;
  const rows = await selectWithJoins(
    "company",
    [],
    { [field]: value, delete: 0 },
    ["companyId"]
  );
  return rows.length > 0;
};

// create company (registration) — same as pehle, no change
const createCompany = async (req, res) => {
  try {
    const {
      companyName,
      companyAddress,
      contactNumber,
      businessEmail,
      ownerName,
      ownerContactNumber,
      ownerEmail,
      country,
      state,
      district,
      taluka,
      registrationDate,
      expiryDate,
      businessType,
      employeeSize,
      gstNumber,
      panNumber,
      aadhaarNumber,
      companyEmail,
      password,
    } = req.body;

    if (await isFieldTaken("email", companyEmail)) {
      return requiredmessage(res, "This company email is already registered.");
    }
    if (await isFieldTaken("businessEmail", businessEmail)) {
      return requiredmessage(res, "This business email is already registered.");
    }
    if (await isFieldTaken("contactNumber", contactNumber)) {
      return requiredmessage(res, "This contact number is already registered.");
    }
    if (await isFieldTaken("gstNumber", gstNumber)) {
      return requiredmessage(res, "This GST number is already registered.");
    }
    if (await isFieldTaken("panNumber", panNumber)) {
      return requiredmessage(res, "This PAN number is already registered.");
    }
    if (await isFieldTaken("aadhaarNumber", aadhaarNumber)) {
      return requiredmessage(res, "This Aadhaar number is already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(30).toString("hex");

    const payload = {
      companyName,
      companyAddress,
      contactNumber,
      businessEmail,
      ownerName,
      ownerContactNumber,
      ownerEmail,
      country,
      state,
      district,
      taluka,
      registrationDate,
      expiryDate,
      businessType,
      employeeSize,
      gstNumber,
      panNumber,
      aadhaarNumber,
      email: companyEmail,
      password: hashedPassword,
      token,
      status: "PENDING",
      delete: 0,
    };

    const company = await saveModel("company", payload);

    const responseData = {
      companyId: company.companyId,
      companyName: company.companyName,
      email: company.email,
      status: company.status,
      token: company.token,
    };

    return successResponse(
      res,
      responseData,
      "Company registered successfully."
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ✅ NAYA — company list fetch karne ke liye
const getCompanyList = async (req, res) => {
  try {
    const rows = await selectWithJoins(
      "company",
      [],
      { delete: 0 },
      [
        "companyId",
        "companyName",
        "companyAddress",
        "contactNumber",
        "ownerName",
        "ownerContactNumber",
        "ownerEmail",
        "country",
        "state",
        "district",
        "taluka",
        "registrationDate",
        "expiryDate",
        "businessType",
        "employeeSize",
        "email",
        "status",
      ]
    );

    // frontend Registration interface ke fields se match karne ke liye map
    const data = (rows || []).map((row) => ({
      id: String(row.companyId),
      companyName: row.companyName || "",
      companyAddress: row.companyAddress || "",
      contactNumber: row.contactNumber || "",
      ownerName: row.ownerName || "",
      ownerContactNumber: row.ownerContactNumber || "",
      ownerEmail: row.ownerEmail || "",
      country: row.country || "",
      state: row.state || "",
      district: row.district || "",
      taluka: row.taluka || "",
      registrationDate: row.registrationDate || "",
      expiryDate: row.expiryDate || "",
      businessType: row.businessType || "",
      employeeSize: row.employeeSize || "",
      companyEmail: row.email || "",
      status: row.status || "",
    }));

    return successResponse(res, data, "Company list fetched successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createCompany,
  getCompanyList,
};