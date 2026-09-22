
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      department,
      branch,
      roleId,
      accountId,
      employeeName,
      mobileNumber,
      alternateNumber,
      email,
      password,
      createdBy,
      createdType,
    } = req.body;

    // role exists aur usi department ka hona chahiye
    const roleExists = await selectWithJoins(
      "role",
      [],
      { roleId, department, delete: 0 },
      ["roleId", "roleName"]   // 👈 label bhi nikal lo check ke liye
    );

    if (roleExists.length === 0) {
      return errorResponse(res, "Selected role not found for this department");
    }

    // Contractor Manager role ho to accountGroupId mandatory
    const isContractorManager = roleExists[0].roleName === "Contractor Manager";
    if (isContractorManager && !accountId) {
      return errorResponse(res, "Please select a party (Sundry Creditor account)");
    }

    // mobile number companyId-wise unique
    const mobileExists = await selectWithJoins(
      "employee",
      [],
      { mobileNumber: mobileNumber.trim(), companyId, delete: 0 },
      ["employeeId"]
    );

    if (mobileExists.length > 0) {
      return errorResponse(res, "Mobile number already exists. Please enter a different number.");
    }

    // email companyId-wise unique
    const emailExists = await selectWithJoins(
      "employee",
      [],
      { email: email.trim().toLowerCase(), companyId, delete: 0 },
      ["employeeId"]
    );

    if (emailExists.length > 0) {
      return errorResponse(res, "Email already exists. Please enter a different email.");
    }

    // company jaisa hi — password hash aur token generate
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(30).toString("hex");

    const payload = {
      companyId,
      department,
      branch,
      roleId,
      employeeName,
      mobileNumber: mobileNumber.trim(),
      alternateNumber: alternateNumber ? alternateNumber.trim() : null,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      token,
      status: "ACTIVE",
      accountId: isContractorManager ? accountId : null,
      createdBy,
      createdType,
      delete: 0,
    };

    const employee = await saveModel("employee", payload);

    const responseData = {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      email: employee.email,
      status: employee.status,
      token: employee.token,
    };

    return successResponse(res, responseData, "Employee created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Mobile number or email already exists.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getEmployeeList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "employee",
      [],
      { companyId, delete: 0 },
      [
        "employeeId",
        "companyId",
        "department",
        "branch",
        "roleId",
        "employeeName",
        "mobileNumber",
        "alternateNumber",
        "email",
        "status",
        "createdBy",
        "createdType",
        "created",
      ],
      [["employeeId", "DESC"]]
    );

    // createdBy me companyId store hai — company table se companyName nikal ke map karna
    const createdByIds = [
      ...new Set((list || []).map((row) => row.createdBy).filter(Boolean)),
    ];

    let companyMap = {};
    if (createdByIds.length > 0) {
      const companies = await selectWithJoins(
        "company",
        [],
        { companyId: createdByIds, delete: 0 },
        ["companyId", "companyName"]
      );
      companyMap = (companies || []).reduce((acc, item) => {
        acc[String(item.companyId)] = item.companyName;
        return acc;
      }, {});
    }

    // ✅ NAYA: same createdByIds employee table me bhi check karo — employeeName nikal ke map karna
    let employeeMap = {};
    if (createdByIds.length > 0) {
      const employees = await selectWithJoins(
        "employee",
        [],
        { employeeId: createdByIds, delete: 0 },
        ["employeeId", "employeeName"]
      );
      employeeMap = (employees || []).reduce((acc, item) => {
        acc[String(item.employeeId)] = item.employeeName;
        return acc;
      }, {});
    }

    const data = (list || []).map((row) => ({
      ...row.toJSON ? row.toJSON() : row,
      createdBy:
        companyMap[String(row.createdBy)] ||
        employeeMap[String(row.createdBy)] ||
        row.createdBy,
    }));

    return successResponse(res, data, "Employee list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getEmployeeById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "employee",
      [],
      { employeeId: id, companyId, delete: 0 },
      [
        "employeeId",
        "companyId",
        "department",
        "branch",
        "roleId",
        "employeeName",
        "mobileNumber",
        "alternateNumber",
        "email",
        "status",
        "createdBy",
        "createdType",
        "created",
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Employee not found");
    }

    const employeeRow = rows[0].toJSON ? rows[0].toJSON() : rows[0];

    // createdBy me companyId store hai — company table se companyName nikalna
    if (employeeRow.createdBy) {
      const companyRows = await selectWithJoins(
        "company",
        [],
        { companyId: employeeRow.createdBy, delete: 0 },
        ["companyId", "companyName"]
      );
      if (companyRows.length > 0) {
        employeeRow.createdBy = companyRows[0].companyName;
      }
    }

    return successResponse(res, employeeRow, "Employee fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      employeeId,
      department,
      branch,
      roleId,
      employeeName,
      mobileNumber,
      alternateNumber,
      email,
      password,
      accountId,
    } = req.body;

    const existing = await selectWithJoins(
      "employee",
      [],
      { employeeId, companyId, delete: 0 },
      ["employeeId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Employee not found");
    }
    const roleExists = await selectWithJoins(
      "role",
      [],
      { roleId, department, delete: 0 },
      ["roleId", "roleName"]   // 👈 roleName bhi select karo, select karna zaruri hai
    );

    if (roleExists.length === 0) {
      return errorResponse(res, "Selected role not found for this department");
    }

    const isContractorManager = roleExists[0].roleName === "Contractor Manager";
    if (isContractorManager && !accountId) {
      return errorResponse(res, "Please select a party (Sundry Creditor account)");
    }

    // mobile number uniqueness (khud ko exclude karke)
    const mobileExists = await selectWithJoins(
      "employee",
      [],
      { mobileNumber: mobileNumber.trim(), companyId, delete: 0 },
      ["employeeId"]
    );

    const mobileTakenByOther = mobileExists.some(
      (row) => String(row.employeeId) !== String(employeeId)
    );

    if (mobileTakenByOther) {
      return errorResponse(res, "Mobile number already exists. Please enter a different number.");
    }

    // email uniqueness (khud ko exclude karke)
    const emailExists = await selectWithJoins(
      "employee",
      [],
      { email: email.trim().toLowerCase(), companyId, delete: 0 },
      ["employeeId"]
    );

    const emailTakenByOther = emailExists.some(
      (row) => String(row.employeeId) !== String(employeeId)
    );

    if (emailTakenByOther) {
      return errorResponse(res, "Email already exists. Please enter a different email.");
    }

    const updatePayload = {
      department,
      branch,
      roleId,
      employeeName,
      mobileNumber: mobileNumber.trim(),
      alternateNumber: alternateNumber ? alternateNumber.trim() : null,
      email: email.trim().toLowerCase(),
      accountId: isContractorManager ? accountId : null,
      updated: new Date(),
    };

    // password sirf tabhi update hoga jab naya bheja gaya ho — hash karke
    if (password && password.trim()) {
      updatePayload.password = await bcrypt.hash(password.trim(), 10);
    }

    await updateModelHelper("employee", updatePayload, { employeeId, companyId });

    return successResponse(res, {}, "Employee updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Mobile number or email already exists.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { employeeId } = req.body;

    const existing = await selectWithJoins(
      "employee",
      [],
      { employeeId, companyId, delete: 0 },
      ["employeeId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Employee not found");
    }

    await updateModelHelper(
      "employee",
      { delete: 1, updated: new Date() },
      { employeeId, companyId }
    );

    return successResponse(res, {}, "Employee deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// KYC CROSS-VALIDATION HELPER (number <-> image, both directions)
// ============================================================

const KYC_PAIRS = [
  { numberKey: "aadharNumber", fileKey: "aadharCardUpload", label: "Aadhar Card" },
  { numberKey: "drivingLicenceNumber", fileKey: "drivingLicenceUpload", label: "Driving Licence" },
  { numberKey: "panNumber", fileKey: "panUpload", label: "PAN Card" },
  { numberKey: "voterIdNumber", fileKey: "voterIdUpload", label: "Voter ID" },
];

const validateKycPairs = (body, files) => {
  for (const { numberKey, fileKey, label } of KYC_PAIRS) {
    const number = body[numberKey] ? String(body[numberKey]).trim() : "";
    const file = files[fileKey];

    if (number && !file) {
      return `Please upload ${label} image since ${label} number is entered.`;
    }
    if (!number && file) {
      return `Please enter ${label} number since ${label} image is uploaded.`;
    }
  }
  return null;
};

// ============================================================
// GET NEXT EMPLOYEE ID (business code, e.g. EMP-000123)
// ============================================================

// ============================================================
// GET NEXT EMPLOYEE CODE (same pattern as Sales Order's getNextSalesOrderNo)
// e.g. EMP/26-27/001
// ============================================================

const getNextEmployeeId = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found. Please select a company year.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    // Retry a few times in case of a collision with another concurrent request
    let employeeCode, fyLabel;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const result = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "employee",
        idColumn: "employeeId",
        prefixFor: "EMPLOYEE",
      });

      // Check if this code is already taken
      const existing = await selectWithJoins(
        "employee",
        [],
        { companyId, financialYearId: fy.financialYearId, employeeCode: result.billNo, delete: 0 },
        ["employeeId"],
      );

      if (existing.length === 0) {
        employeeCode = result.billNo;
        fyLabel = result.fyLabel;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    if (!employeeCode) {
      return errorResponse(res, "Could not generate a unique Employee ID. Please try again.");
    }

    return successResponse(
      res,
      { employeeId: employeeCode, fyLabel, financialYearId: fy.financialYearId },
      "Employee ID generated successfully",
    );
  } catch (error) {
    console.error("getNextEmployeeId error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET UNREGISTERED EMPLOYEES (for "Select Employee" combobox —
// created via master/employee but wizard not yet completed)
// ============================================================
const getRegisteredEmployeeList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(
        res,
        "Unauthorized. Please login again."
      );
    }

    const { financialYearId } = req.query;

    const whereCondition = {
      companyId,
      isRegistered: 1,
      delete: 0,
    };

    // Financial year filter if provided
    if (financialYearId) {
      whereCondition.financialYearId = Number(financialYearId);
    }

    console.log(
      "Registered Employee List Where:",
      whereCondition
    );

    const list = await selectWithJoins(
      "employee",
      [],
      whereCondition,
      [
        "employeeId",
        "companyId",

        // Master employee fields
        "department",
        "branch",
        "roleId",
        "employeeName",
        "mobileNumber",
        "alternateNumber",
        "email",
        "status",

        // Registration fields
        "financialYearId",
        "employeeCode",
        "isRegistered",

        "firstName",
        "lastName",
        "middleName",
        "dateOfBirth",
        "gender",
        "maritalStatus",
        "bloodGroup",
        "personalMobileNo",
        "personalEmail",
        "employeePhoto",
        "aadharNumber",
        "aadharCardUpload",
        "drivingLicenceNumber",
        "drivingLicenceUpload",
        "panNumber",
        "panUpload",
        "voterIdNumber",
        "voterIdUpload",

        "address",
        "country",
        "state",
        "city",
        "pincode",

        "sameAsPermanentAddress",
        "permanentAddress",
        "permanentCountry",
        "permanentState",
        "permanentCity",
        "permanentPincode",

        "joiningDate",
        "employeeType",
        "designation",
        "branchLocation",
        "employeeStatus",
        "noticePeriod",

        "createdBy",
        "createdType",
        "created",
      ],
      [["employeeId", "DESC"]]
    );

    const data = (list || []).map((row) =>
      row.toJSON ? row.toJSON() : row
    );

    console.log(
      "Registered Employee List Count:",
      data.length
    );

    return successResponse(
      res,
      data,
      "Registered employee list fetched successfully"
    );
  } catch (error) {
    console.error(
      "getRegisteredEmployeeList error:",
      error
    );

    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
  }
};
const getUnregisteredEmployeeList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoins(
      "employee",
      [],
      { companyId, isRegistered: 0, delete: 0 },
      ["employeeId", "employeeName", "mobileNumber", "email", "department", "branch"],
      [["employeeId", "DESC"]],
    );

    return successResponse(res, list, "Unregistered employee list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// REGISTER EMPLOYEE (fills Identity/Address/Employee Details
// wizard data into the SAME employee row picked from combobox)
// ============================================================

const registerEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const body = req.body;
    const employeeId = Number(body.employeeId);
    const { financialYearId } = body;

    if (!employeeId) {
      return errorResponse(res, "Please select an employee.");
    }

    if (!financialYearId) {
      return errorResponse(res, "Financial Year not found. Please select a company year.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    // ---- existing row must belong to this company and not already registered ----
    const existing = await selectWithJoins(
      "employee",
      [],
      { employeeId, companyId, delete: 0 },
      ["employeeId", "isRegistered", "aadharCardUpload", "drivingLicenceUpload", "panUpload", "voterIdUpload"],
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Employee not found");
    }

    if (Number(existing[0].isRegistered) === 1) {
      return errorResponse(res, "This employee has already been registered.");
    }

    // ---- image uploads (multer via req.files) ----
    const aadharCardUpload = req.files?.aadharCardUpload?.[0]
      ? `/Uploadimages/employee_register/${req.files.aadharCardUpload[0].filename}`
      : null;
    const drivingLicenceUpload = req.files?.drivingLicenceUpload?.[0]
      ? `/Uploadimages/employee_register/${req.files.drivingLicenceUpload[0].filename}`
      : null;
    const panUpload = req.files?.panUpload?.[0]
      ? `/Uploadimages/employee_register/${req.files.panUpload[0].filename}`
      : null;
    const voterIdUpload = req.files?.voterIdUpload?.[0]
      ? `/Uploadimages/employee_register/${req.files.voterIdUpload[0].filename}`
      : null;
    const employeePhoto = req.files?.employeePhoto?.[0]
      ? `/Uploadimages/employee_register/${req.files.employeePhoto[0].filename}`
      : null;
    // ---- KYC bidirectional validation ----
    const kycError = validateKycPairs(body, {
      aadharCardUpload,
      drivingLicenceUpload,
      panUpload,
      voterIdUpload,
    });

    if (kycError) {
      return errorResponse(res, kycError);
    }

    // ---- generate employee code the SAME way as getNextEmployeeId (Sales Order style) ----
    let employeeCode;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const result = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "employee",
        idColumn: "employeeId",
        prefixFor: "EMPLOYEE",
      });

      const codeExists = await selectWithJoins(
        "employee",
        [],
        { companyId, financialYearId: fy.financialYearId, employeeCode: result.billNo, delete: 0 },
        ["employeeId"],
      );

      if (codeExists.length === 0) {
        employeeCode = result.billNo;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    if (!employeeCode) {
      return errorResponse(res, "Could not generate a unique Employee ID. Please try again.");
    }

    const sameAsPermanent =
      body.sameAsPermanentAddress === "true" || body.sameAsPermanentAddress === true;

    const updatePayload = {
      financialYearId: fy.financialYearId,
      employeeCode,
      isRegistered: 1,

      firstName: String(body.firstName).trim(),
      lastName: String(body.lastName).trim(),
      middleName: body.middleName || null,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      maritalStatus: body.maritalStatus,
      bloodGroup: body.bloodGroup || null,
      personalMobileNo: String(body.personalMobileNo).trim(),
      personalEmail: body.personalEmail || null,
      employeePhoto,
      aadharNumber: body.aadharNumber || null,
      aadharCardUpload,
      drivingLicenceNumber: body.drivingLicenceNumber || null,
      drivingLicenceUpload,
      panNumber: body.panNumber || null,
      panUpload,
      voterIdNumber: body.voterIdNumber || null,
      voterIdUpload,

      address: body.address,
      country: body.country,
      state: body.state,
      city: body.city,
      pincode: body.pincode,

      sameAsPermanentAddress: sameAsPermanent,
      permanentAddress: body.permanentAddress || null,
      permanentCountry: body.permanentCountry || null,
      permanentState: body.permanentState || null,
      permanentCity: body.permanentCity || null,
      permanentPincode: body.permanentPincode || null,

      joiningDate: body.joiningDate,
      employeeType: body.employeeType,
      designation: body.designation,
      branchLocation: body.branchLocation || null,
      employeeStatus: body.employeeStatus,
      noticePeriod: body.noticePeriod || null,
      workingDays: body.workingDays || null,
      weeklyOff: body.weeklyOff || null,
      workingHoursFrom: body.workingHoursFrom || null,
      workingHoursTo: body.workingHoursTo || null,
      workingShift: body.workingShift || null,
      updated: new Date(),
    };

    await updateModelHelper("employee", updatePayload, { employeeId, companyId });

    return successResponse(
      res,
      { employeeId, employeeCode },
      "Employee registered successfully",
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};
// ============================================================
// GET REGISTERED EMPLOYEES
// Only employees whose registration wizard is completed
// ============================================================
// ============================================================
// GET REGISTERED EMPLOYEE BY ID
// Full Employee Register/Edit data
// ============================================================

const getRegisteredEmployeeById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(
        res,
        "Unauthorized. Please login again."
      );
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Employee ID is required.");
    }

    const rows = await selectWithJoins(
      "employee",
      [],
      {
        employeeId: Number(id),
        companyId,
        isRegistered: 1,
        delete: 0,
      },
      [
        // ------------------------------------------------------
        // Master Employee
        // ------------------------------------------------------
        "employeeId",
        "companyId",
        "department",
        "branch",
        "roleId",
        "employeeName",
        "mobileNumber",
        "alternateNumber",
        "email",
        "status",

        // ------------------------------------------------------
        // Registration
        // ------------------------------------------------------
        "financialYearId",
        "employeeCode",
        "isRegistered",

        // Personal Details
        "firstName",
        "lastName",
        "middleName",
        "dateOfBirth",
        "gender",
        "maritalStatus",
        "bloodGroup",
        "personalMobileNo",
        "personalEmail",

        // KYC
        "employeePhoto",
        "aadharNumber",
        "aadharCardUpload",
        "drivingLicenceNumber",
        "drivingLicenceUpload",
        "panNumber",
        "panUpload",
        "voterIdNumber",
        "voterIdUpload",

        // Current Address
        "address",
        "country",
        "state",
        "city",
        "pincode",

        // Permanent Address
        "sameAsPermanentAddress",
        "permanentAddress",
        "permanentCountry",
        "permanentState",
        "permanentCity",
        "permanentPincode",

        // Employee Details
        "joiningDate",
        "employeeType",
        "designation",
        "branchLocation",
        "employeeStatus",
        "noticePeriod",
        "workingDays",
        "weeklyOff",
        "workingHoursFrom",
        "workingHoursTo",
        "workingShift",
        // Audit
        "createdBy",
        "createdType",
        "created",
        "updated",
      ]
    );

    if (!rows || rows.length === 0) {
      return requiredmessage(
        res,
        "Registered employee not found."
      );
    }

    const employee = rows[0].toJSON
      ? rows[0].toJSON()
      : rows[0];

    return successResponse(
      res,
      employee,
      "Registered employee fetched successfully"
    );
  } catch (error) {
    console.error(
      "getRegisteredEmployeeById error:",
      error
    );

    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
  }
};


// ============================================================
// UPDATE REGISTERED EMPLOYEE
// Employee Register Edit API
// ============================================================

const updateRegisteredEmployee = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(
        res,
        "Unauthorized. Please login again."
      );
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(
        res,
        "Employee ID is required."
      );
    }

    const employeeId = Number(id);

    if (!employeeId) {
      return errorResponse(
        res,
        "Invalid Employee ID."
      );
    }

    // ----------------------------------------------------------
    // Existing registered employee
    // ----------------------------------------------------------

    const existingRows = await selectWithJoins(
      "employee",
      [],
      {
        employeeId,
        companyId,
        isRegistered: 1,
        delete: 0,
      },
      [
        "employeeId",
        "employeeCode",
        "isRegistered",
        "workingDays",
        "weeklyOff",
        "workingHoursFrom",
        "workingHoursTo",
        "workingShift",
        // Existing KYC files
        "employeePhoto",
        "aadharCardUpload",
        "drivingLicenceUpload",
        "panUpload",
        "voterIdUpload",
      ]
    );

    if (!existingRows || existingRows.length === 0) {
      return requiredmessage(
        res,
        "Registered employee not found."
      );
    }

    const existing = existingRows[0].toJSON
      ? existingRows[0].toJSON()
      : existingRows[0];

    const body = req.body || {};
    const files = req.files || {};

    // ----------------------------------------------------------
    // KYC uploads
    //
    // New file => use new file
    // No new file => keep existing file
    // ----------------------------------------------------------

    const aadharCardUpload =
      files?.aadharCardUpload?.[0]
        ? `/Uploadimages/employee_register/${files.aadharCardUpload[0].filename}`
        : existing.aadharCardUpload || null;

    const drivingLicenceUpload =
      files?.drivingLicenceUpload?.[0]
        ? `/Uploadimages/employee_register/${files.drivingLicenceUpload[0].filename}`
        : existing.drivingLicenceUpload || null;

    const panUpload =
      files?.panUpload?.[0]
        ? `/Uploadimages/employee_register/${files.panUpload[0].filename}`
        : existing.panUpload || null;

    const voterIdUpload =
      files?.voterIdUpload?.[0]
        ? `/Uploadimages/employee_register/${files.voterIdUpload[0].filename}`
        : existing.voterIdUpload || null;
    const employeePhoto =
      files?.employeePhoto?.[0]
        ? `/Uploadimages/employee_register/${files.employeePhoto[0].filename}`
        : existing.employeePhoto || null;

    // ----------------------------------------------------------
    // KYC validation
    // Existing files are also considered valid
    // ----------------------------------------------------------

    const kycError = validateKycPairs(
      body,
      {
        aadharCardUpload,
        drivingLicenceUpload,
        panUpload,
        voterIdUpload,
      }
    );

    if (kycError) {
      return errorResponse(
        res,
        kycError
      );
    }


    // ----------------------------------------------------------
    // Same permanent address
    // FormData sends boolean as string
    // ----------------------------------------------------------

    const sameAsPermanent =
      body.sameAsPermanentAddress === "true" ||
      body.sameAsPermanentAddress === true;


    // ----------------------------------------------------------
    // Update payload
    // ----------------------------------------------------------

    const updatePayload = {
      // --------------------------------------------------------
      // Personal Details
      // --------------------------------------------------------

      firstName:
        body.firstName !== undefined
          ? String(body.firstName).trim()
          : existing.firstName,

      lastName:
        body.lastName !== undefined
          ? String(body.lastName).trim()
          : existing.lastName,

      middleName:
        body.middleName || null,

      dateOfBirth:
        body.dateOfBirth || null,

      gender:
        body.gender || null,

      maritalStatus:
        body.maritalStatus || null,

      bloodGroup:
        body.bloodGroup || null,

      personalMobileNo:
        body.personalMobileNo
          ? String(body.personalMobileNo).trim()
          : null,

      personalEmail:
        body.personalEmail
          ? String(body.personalEmail).trim().toLowerCase()
          : null,


      // --------------------------------------------------------
      // KYC
      // --------------------------------------------------------
      employeePhoto,
      aadharNumber:
        body.aadharNumber || null,

      aadharCardUpload,

      drivingLicenceNumber:
        body.drivingLicenceNumber || null,

      drivingLicenceUpload,

      panNumber:
        body.panNumber || null,

      panUpload,

      voterIdNumber:
        body.voterIdNumber || null,

      voterIdUpload,


      // --------------------------------------------------------
      // Current Address
      // --------------------------------------------------------

      address:
        body.address || null,

      country:
        body.country || null,

      state:
        body.state || null,

      city:
        body.city || null,

      pincode:
        body.pincode || null,


      // --------------------------------------------------------
      // Permanent Address
      // --------------------------------------------------------

      sameAsPermanentAddress:
        sameAsPermanent,

      permanentAddress:
        sameAsPermanent
          ? body.address || null
          : body.permanentAddress || null,

      permanentCountry:
        sameAsPermanent
          ? body.country || null
          : body.permanentCountry || null,

      permanentState:
        sameAsPermanent
          ? body.state || null
          : body.permanentState || null,

      permanentCity:
        sameAsPermanent
          ? body.city || null
          : body.permanentCity || null,

      permanentPincode:
        sameAsPermanent
          ? body.pincode || null
          : body.permanentPincode || null,


      // --------------------------------------------------------
      // Employee Details
      // --------------------------------------------------------

      joiningDate:
        body.joiningDate || null,

      employeeType:
        body.employeeType || null,

      designation:
        body.designation || null,

      branchLocation:
        body.branchLocation || null,

      employeeStatus:
        body.employeeStatus || null,

      noticePeriod:
        body.noticePeriod || null,
      workingDays:
        body.workingDays || existing.workingDays || null,

      weeklyOff:
        body.weeklyOff || existing.weeklyOff || null,

      workingHoursFrom:
        body.workingHoursFrom || existing.workingHoursFrom || null,

      workingHoursTo:
        body.workingHoursTo || existing.workingHoursTo || null,

      workingShift:
        body.workingShift || existing.workingShift || null,
      // --------------------------------------------------------
      // Updated
      // --------------------------------------------------------

      updated: new Date(),
    };


    // ----------------------------------------------------------
    // Optional department
    // ----------------------------------------------------------

    if (body.department !== undefined) {
      updatePayload.department =
        body.department || null;
    }


    // ----------------------------------------------------------
    // Update
    // ----------------------------------------------------------

    await updateModelHelper(
      "employee",
      updatePayload,
      {
        employeeId,
        companyId,
      }
    );


    return successResponse(
      res,
      {
        employeeId,
        employeeCode: existing.employeeCode,
      },
      "Employee updated successfully"
    );

  } catch (error) {
    console.error(
      "updateRegisteredEmployee error:",
      error
    );

    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
  }
};
// ============================================================
// GET EMPLOYEE PROFILE
// Employee Panel - General Profile
// GET /hr/employee/profile?employeeId=123
// ============================================================

const getEmployeeProfile = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(
        res,
        "Unauthorized. Please login again."
      );
    }

    // employeeId comes from query:
    // /hr/employee/profile?employeeId=123
    const employeeId = Number(req.query.employeeId);

    if (!employeeId || Number.isNaN(employeeId)) {
      return errorResponse(
        res,
        "Valid Employee ID is required."
      );
    }

    const rows = await selectWithJoins(
      "employee",
      [],
      {
        employeeId,
        companyId,
        delete: 0,
      },
      [
        // ------------------------------------------------------
        // Master Employee
        // ------------------------------------------------------
        "employeeId",
        "companyId",
        "department",
        "branch",
        "roleId",
        "employeeName",
        "mobileNumber",
        "alternateNumber",
        "email",
        "status",

        // ------------------------------------------------------
        // Registration
        // ------------------------------------------------------
        "financialYearId",
        "employeeCode",
        "isRegistered",

        // ------------------------------------------------------
        // Personal Details
        // ------------------------------------------------------
        "firstName",
        "lastName",
        "middleName",
        "dateOfBirth",
        "gender",
        "maritalStatus",
        "bloodGroup",
        "personalMobileNo",
        "personalEmail",

        // ------------------------------------------------------
        // KYC
        // ------------------------------------------------------
        "employeePhoto",
        "aadharNumber",
        "drivingLicenceNumber",
        "panNumber",
        "voterIdNumber",

        // ------------------------------------------------------
        // Current Address
        // ------------------------------------------------------
        "address",
        "country",
        "state",
        "city",
        "pincode",

        // ------------------------------------------------------
        // Permanent Address
        // ------------------------------------------------------
        "sameAsPermanentAddress",
        "permanentAddress",
        "permanentCountry",
        "permanentState",
        "permanentCity",
        "permanentPincode",

        // ------------------------------------------------------
        // Employee Details
        // ------------------------------------------------------
        "joiningDate",
        "employeeType",
        "designation",
        "branchLocation",
        "employeeStatus",
        "noticePeriod",

        // ------------------------------------------------------
        // Work Information
        // ------------------------------------------------------
        "workingDays",
        "weeklyOff",
        "workingHoursFrom",
        "workingHoursTo",
        "workingShift",

        // ------------------------------------------------------
        // Audit
        // ------------------------------------------------------
        "createdBy",
        "createdType",
        "created",
        "updated",
      ],
      [["employeeId", "DESC"]]
    );

    if (!rows || rows.length === 0) {
      return requiredmessage(
        res,
        "Employee profile not found."
      );
    }

    const employee = rows[0].toJSON
      ? rows[0].toJSON()
      : rows[0];

    return successResponse(
      res,
      employee,
      "Employee profile fetched successfully"
    );

  } catch (error) {
    console.error(
      "getEmployeeProfile error:",
      error
    );

    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
  }
};






const getContractorManagers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const role = await selectWithJoins(
      "role",
      [],
      {
        delete: 0,
        roleName: "Contractor Manager",
      },
      ["roleId"],
      [["roleId", "ASC"]]
    );

    if (!role || role.length === 0) {
      return successResponse(
        res,
        [],
        "Contractor Manager role not found"
      );
    }

    const roleId = role[0].roleId;

    const where = {
      delete: 0,
      roleId: roleId,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const list = await selectWithJoins(
      "employee",
      [],
      where,
      [
        "employeeId",
        "employeeName",
        "department",
        "branch",
        "roleId",
      ],
      [["employeeName", "ASC"]]
    );

    return successResponse(
      res,
      list,
      "Contractor Manager list fetched successfully"
    );
  } catch (error) {
    console.error("getContractorManagers error:", error);

    return errorResponse(
      res,
      "Something Went Wrong",
      error
    );
  }
};



module.exports = {
  createEmployee,
  getEmployeeList,

  getRegisteredEmployeeList,
  getRegisteredEmployeeById,

  getEmployeeById,

  updateEmployee,
  updateRegisteredEmployee,

  deleteEmployee,
  getEmployeeProfile,
  getNextEmployeeId,
  getUnregisteredEmployeeList,
  registerEmployee,
  getContractorManagers,
};