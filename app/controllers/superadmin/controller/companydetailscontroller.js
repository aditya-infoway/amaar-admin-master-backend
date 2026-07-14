const {
  errorResponse,
  successResponse,
  requiredmessage,
  saveModel,
  updateModel,
  selectWithJoins,
  selectWithJoinsV2,
  getBlobTempPublicUrl
} = require("../../../helper/index.js");

const fs = require("fs");
const path = require("path");

// ---- Create Company Details + Financial Year ----
const createCompanyDetails = async (req, res) => {
  try {
    const companyId = await getCompanyIdFromToken(req);

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      companyName,
      natureOfBusiness,
      taxSystem,
      addressLine1,
      addressLine2,
      city,
      pinCode,
      country,
      state,
      stateCode,
      district,
      mobile,
      phone,
      email,
      website,
      dateFormat,
      gstNo,
      vatNo,
      panNo,
      tanNo,
      dlNo1,
      dlNo2,
      dealsIn,
      bankHolderName,
      bankAccountNo,
      branchName,
      ifscCode,
      financialYear,
    } = req.body;

    // ---- 1. Insert into companydetails table ----
    const companyDetailsPayload = {
      companyId,
      companyName,
      natureOfBusiness,
      taxSystem,
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      pinCode,
      country,
      state,
      stateCode,
      district,
      mobile,
      phone: phone || "",
      email,
      website: website || "",
      dateFormat,
      gstNo: gstNo || "",
      vatNo: vatNo || "",
      panNo: panNo || "",
      tanNo: tanNo || "",
      dlNo1: dlNo1 || "",
      dlNo2: dlNo2 || "",
      dealsIn: dealsIn || "",
      bankHolderName: bankHolderName || "",
      bankAccountNo: bankAccountNo || "",
      branchName: branchName || "",
      ifscCode: ifscCode || "",
      delete: 0,
    };

    const companyDetailsData = await saveModel("companydetails", companyDetailsPayload);
    const companyDetailsId = companyDetailsData?.companyDetailsId;

    if (!companyDetailsId) {
      return errorResponse(res, "Failed to save company details");
    }

    // ---- 2. Insert into financialyear table ----
    const financialYearPayload = {
      companyDetailsId,
      companyId,
      startDate: financialYear.startDate,
      endDate: financialYear.endDate,
      delete: 0,
    };

    const financialYearData = await saveModel("financialyear", financialYearPayload);
    const financialYearId = financialYearData?.financialYearId;

    if (!financialYearId) {
      return errorResponse(res, "Failed to save financial year details");
    }

    return successResponse(
      res,
      { companyDetailsId, financialYearId },
      "Company details saved successfully."
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---- Get company from token ----
const getCompanyIdFromToken = async (req) => {
  const token = req.headers["x-token"] || req.headers["X-Token"] || "";

  if (!token) {
    return null;
  }

  const companyRows = await selectWithJoins(
    "company",
    [],
    { token, delete: 0 },
    ["companyId"]
  );

  if (companyRows.length === 0) {
    return null;
  }

  return companyRows[0].companyId;
};

// ---- Get all Financial Years for logged-in company (with companyName) ----
const getFinancialYears = async (req, res) => {
  try {
    const companyId = await getCompanyIdFromToken(req);

    if (!companyId) {
      return requiredmessage(res, "Invalid or expired session. Please login again.");
    }

    const tableName = "financialyear";
    const joinTables = [
      {
        table: "companydetails",
        alias: "cd",
        onClause: {
          '"cd"."companyDetailsId"': { "=": '"financialyear"."companyDetailsId"' },
        },
      },
    ];
    const whereClause = {
      '"financialyear"."companyId"': companyId,
      '"financialyear"."delete"': 0,
      '"cd"."delete"': 0,
    };
    const attributes = [
      '"financialyear"."financialYearId"',
      '"financialyear"."companyDetailsId"',
      '"financialyear"."companyId"',
      '"financialyear"."startDate"',
      '"financialyear"."endDate"',
      '"cd"."companyName"',
    ];
    const order = [['"financialyear"."startDate"', "DESC"]];

    const rows = await selectWithJoinsV2(
      tableName,
      joinTables,
      whereClause,
      attributes,
      order,
      null,
      0
    );

    return successResponse(res, rows, "Financial years fetched successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---- Get single Company Details by companyDetailsId ----
const getCompanyDetails = async (req, res) => {
  try {
    const companyId = await getCompanyIdFromToken(req);

    if (!companyId) {
      return requiredmessage(res, "Invalid or expired session. Please login again.");
    }

    const companyDetailsId = req.query.companyDetailsId;

    if (!companyDetailsId) {
      return requiredmessage(res, "companyDetailsId is required");
    }

    const rows = await selectWithJoins(
      "companydetails",
      [],
      {
        companyDetailsId,
        companyId,
        delete: 0,
      },
      [
        "companyDetailsId",
        "companyId",
        "companyName",
        "natureOfBusiness",
        "taxSystem",
        "addressLine1",
        "addressLine2",
        "city",
        "pinCode",
        "country",
        "state",
        "stateCode",
        "district",
        "mobile",
        "phone",
        "email",
        "website",
        "dateFormat",
        "gstNo",
        "vatNo",
        "panNo",
        "tanNo",
        "dlNo1",
        "dlNo2",
        "dealsIn",
        "bankHolderName",
        "bankAccountNo",
        "branchName",
        "ifscCode",
        "logo",   // 👈 add karo
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Company details not found.");
    }

    const data = rows[0];
    data.logo = getBlobTempPublicUrl(data.logo); // 👈 full URL bana do

    return successResponse(res, data, "Company details fetched successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---- Update Company Details (with optional logo upload) ----
const updateCompanyDetails = async (req, res) => {
  try {
    const companyId = await getCompanyIdFromToken(req);

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      companyDetailsId,
      companyName,
      natureOfBusiness,
      taxSystem,
      addressLine1,
      addressLine2,
      city,
      pinCode,
      country,
      state,
      stateCode,
      district,
      mobile,
      phone,
      email,
      website,
      dateFormat,
      gstNo,
      vatNo,
      panNo,
      tanNo,
      dlNo1,
      dlNo2,
      dealsIn,
      bankHolderName,
      bankAccountNo,
      branchName,
      ifscCode,
    } = req.body;

    const existing = await selectWithJoins(
      "companydetails",
      [],
      { companyDetailsId, companyId, delete: 0 },
      ["companyDetailsId", "logo"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Company details not found.");
    }

    const updatePayload = {
      companyName,
      natureOfBusiness,
      taxSystem,
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      pinCode,
      country,
      state,
      stateCode,
      district,
      mobile,
      phone: phone || "",
      email,
      website: website || "",
      dateFormat,
      gstNo: gstNo || "",
      vatNo: vatNo || "",
      panNo: panNo || "",
      tanNo: tanNo || "",
      dlNo1: dlNo1 || "",
      dlNo2: dlNo2 || "",
      dealsIn: dealsIn || "",
      bankHolderName: bankHolderName || "",
      bankAccountNo: bankAccountNo || "",
      branchName: branchName || "",
      ifscCode: ifscCode || "",
      updated: new Date(),
    };

    if (req.file) {
      // 👇 subfolder ke saath relative path DB me save karo
      updatePayload.logo = "company_logo/" + req.file.filename;

      const oldLogo = existing[0].logo;
      if (oldLogo) {
        const oldPath = path.join("./Uploadimages", oldLogo);
        fs.unlink(oldPath, (err) => {
          if (err) console.log("Old logo delete failed:", err.message);
        });
      }
    }

    await updateModel(
      "companydetails",
      updatePayload,
      { companyDetailsId, companyId }
    );

    return successResponse(res, {}, "Company details updated successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createCompanyDetails,
  getFinancialYears,
  getCompanyDetails,
  updateCompanyDetails
};