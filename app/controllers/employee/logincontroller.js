const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  errorResponse,
  successResponse,
  requiredmessage,
  selectWithJoins,
  selectWithJoinsV2,
  updateModel,
} = require("../../helper/index.js");

// ---------------- LOGIN ----------------
const employeeLogin = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return requiredmessage(res, "Email and Password are required.");
    }

    // ---- Step 1: employee fetch by email ----
    const employeeRows = await selectWithJoins(
      "employee",
      [],
      { email, delete: 0 },
      [
        "employeeId",
        "companyId",
        "department",
        "branch",
        "roleId",
        "employeeName",
        "email",
        "password",
        "status",
      ]
    );

    if (employeeRows.length === 0) {
      return requiredmessage(res, "Invalid Email or Password");
    }

    const employee = employeeRows[0];

    if (employee.status !== "ACTIVE") {
      return requiredmessage(res, "Your account is inactive. Please contact admin.");
    }

    // ---- Step 2: password check ----
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return requiredmessage(res, "Invalid Email or Password");
    }

    // ---- Step 3: company table se expiryDate lookup (join ke jagah) ----
    const companyRows = await selectWithJoins(
      "company",
      [],
      { companyId: employee.companyId, delete: 0 },
      ["companyId", "companyName", "expiryDate", "status"]
    );

    if (companyRows.length === 0) {
      return requiredmessage(res, "Company not found. Please contact administrator.");
    }

    const company = companyRows[0];

    // ---- Step 4: company expiry date check ----
    if (company.expiryDate) {
      const expiry = new Date(company.expiryDate);
      const today = new Date();
      expiry.setHours(23, 59, 59, 999);

      if (expiry < today) {
        return requiredmessage(
          res,
          "Your company's subscription has expired. Please contact the administrator to renew."
        );
      }
    }

    // ---- Step 5: role table se roleName lookup ----
    let roleName = "";
    if (employee.roleId) {
      const roleRows = await selectWithJoins(
        "role",
        [],
        { roleId: employee.roleId, delete: 0 },
        ["roleId", "roleName", "department"]
      );

      if (roleRows.length > 0) {
        roleName = roleRows[0].roleName;
      }
    }

    // ---- Step 6: token generate & save ----
    const token = crypto.randomBytes(30).toString("hex");

    await updateModel(
      "employee",
      { token, updated: new Date() },
      { employeeId: employee.employeeId }
    );

    const responseData = {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      email: employee.email,
      companyId: employee.companyId,
      companyName: company.companyName,
      department: employee.department,
      branch: employee.branch,
      roleId: employee.roleId,
      roleName,
      token,
    };

    return successResponse(res, responseData, "Login Successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---- Get company from token ----
const getEmployeeIdFromToken = async (req) => {
  const token = req.headers["x-token"] || req.headers["X-Token"] || "";

  if (!token) {
    return null;
  }

  const employeeRows = await selectWithJoins(
    "employee",
    [],
    { token, delete: 0 },
    ["companyId"]
  );

  if (employeeRows.length === 0) {
    return null;
  }

  return employeeRows[0].companyId;
};

// ---- Get all Financial Years for logged-in company (with companyName) ----
const getFinancialYears = async (req, res) => {
  try {
    const companyId = await getEmployeeIdFromToken(req);

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

// ---------------- Example protected route: logged-in employee ka apna profile ----------------
const getEmployeeProfile = async (req, res) => {
  try {
    const rows = await selectWithJoins(
      "employee",
      [],
      { employeeId: req.employeeId, delete: 0 },
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
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Employee not found.");
    }

    const employee = rows[0].toJSON ? rows[0].toJSON() : rows[0];

    // roleName bhi profile me add karna
    if (employee.roleId) {
      const roleRows = await selectWithJoins(
        "role",
        [],
        { roleId: employee.roleId, delete: 0 },
        ["roleId", "roleName"]
      );
      employee.roleName = roleRows.length > 0 ? roleRows[0].roleName : "";
    }

    return successResponse(res, employee, "Profile fetched successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  employeeLogin,
  getFinancialYears,
  getEmployeeProfile,
};