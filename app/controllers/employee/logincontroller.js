const { isWithinAllowedRadius } = require("../../helper/geoDistance.js");
const { getDateString } = require("../../helper/dateHelper.js");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  errorResponse,
  successResponse,
  requiredmessage,
  selectWithJoins,
  selectWithJoinsV2,
  updateModel,
    saveModel,
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
      const { latitude, longitude } = req.body;

    const companyDetailsRows = await selectWithJoins(
      "companydetails",
      [],
      { companyId: employee.companyId, delete: 0 },
      ["latitude", "longitude"]
    );

    const companyDetails = companyDetailsRows[0];

 if (
      companyDetails &&
      companyDetails.latitude != null &&
      companyDetails.longitude != null
    ) {
      if (latitude == null || longitude == null) {
        return requiredmessage(
          res,
          "Location access is required to login. Please enable location and try again."
        );
      }

      const { withinRange } = isWithinAllowedRadius(
        { latitude: companyDetails.latitude, longitude: companyDetails.longitude },
        { latitude, longitude },
        100 // allowed radius in meters
      );

      if (!withinRange) {
        return requiredmessage(
          res,
          "You must be within office premises to login."
        );
      }
    }
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

   
    const token = crypto.randomBytes(30).toString("hex");

    await updateModel(
      "employee",
      { token, updated: new Date() },
      { employeeId: employee.employeeId }
    );

    // ---- Step 6.5: Attendance check-in (saved directly on employee row) ----
       // ---- Step 6.5: Attendance check-in (attendance table, one row per session) ----
  const now = new Date();
const todayDateStr = getDateString(now);

const openAttendanceRows = await selectWithJoins(
  "attendance",
  [],
  { employeeId: employee.employeeId, isCheckedIn: true, delete: 0 },
  ["attendanceId", "checkinDate", "checkinTime", "lastCheckinTime", "countTime"],
  [["attendanceId", "DESC"]]
);

const openRow = openAttendanceRows[0];

if (openRow && openRow.checkinDate === todayDateStr) {
  await updateModel(
    "attendance",
    { updated: now },
    { attendanceId: openRow.attendanceId }
  );
} else if (openRow && openRow.checkinDate !== todayDateStr) {
  const lastCheckin = new Date(openRow.lastCheckinTime || openRow.checkinTime);
  const endOfThatDay = new Date(openRow.checkinDate + "T23:59:59");
  const sessionSeconds = Math.max(0, Math.floor((endOfThatDay - lastCheckin) / 1000));
  const finalCountTime = (openRow.countTime || 0) + sessionSeconds;

  await updateModel(
    "attendance",
    {
      isCheckedIn: false,
      checkoutTime: endOfThatDay,
      countTime: finalCountTime,
      status: "AUTO_CLOSED",
      updated: now,
    },
    { attendanceId: openRow.attendanceId }
  );

  await saveModel("attendance", {
    companyId: employee.companyId,
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    checkinDate: todayDateStr,
    checkinTime: now,
    lastCheckinTime: now,
    checkinLatitude: latitude ?? null,
    checkinLongitude: longitude ?? null,
    countTime: 0,
    isCheckedIn: true,
    delete: 0,
  });
} else {
  const todayRows = await selectWithJoins(
    "attendance",
    [],
    { employeeId: employee.employeeId, checkinDate: todayDateStr, delete: 0 },
    ["attendanceId", "countTime"]
  );

  if (todayRows.length > 0) {
    await updateModel(
      "attendance",
      {
        isCheckedIn: true,
        lastCheckinTime: now,
        checkinLatitude: latitude ?? null,
        checkinLongitude: longitude ?? null,
        updated: now,
      },
      { attendanceId: todayRows[0].attendanceId }
    );
  } else {
    await saveModel("attendance", {
      companyId: employee.companyId,
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      checkinDate: todayDateStr,
      checkinTime: now,
      lastCheckinTime: now,
      checkinLatitude: latitude ?? null,
      checkinLongitude: longitude ?? null,
      countTime: 0,
      isCheckedIn: true,
      delete: 0,
    });
  }
}

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
// ---------------- CHECK OUT ----------------
// ---------------- CHECK OUT ----------------
const employeeCheckout = async (req, res) => {
  try {
    const employeeId = req.employeeId;
    const { latitude, longitude } = req.body; // 👈 ab checkout pe bhi location lo

    if (!employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const openRows = await selectWithJoins(
      "attendance",
      [],
      { employeeId, isCheckedIn: true, delete: 0 },
      ["attendanceId", "checkinDate", "lastCheckinTime", "countTime"],
      [["attendanceId", "DESC"]]
    );

    if (openRows.length === 0) {
      return errorResponse(res, "No active check-in found. Please check in first.");
    }

    const record = openRows[0];
    const now = new Date();
    const todayDateStr = getDateString(now);

    // Agar checkout ke time tak date badal chuki hai, session ko us purani date ke
    // 23:59:59 tak hi count karo (login flow anyway agle din auto-close kar dega,
    // ye ek safety net hai agar direct checkout hi pehle aa gaya)
    const lastCheckin = new Date(record.lastCheckinTime);
    const cutoffTime =
      record.checkinDate === todayDateStr
        ? now
        : new Date(record.checkinDate + "T23:59:59");

    const sessionSeconds = Math.max(
      0,
      Math.floor((cutoffTime - lastCheckin) / 1000)
    );
    const newCountTime = (record.countTime || 0) + sessionSeconds;

    await updateModel(
      "attendance",
      {
        isCheckedIn: false,
        checkoutTime: now,
        checkoutLatitude: latitude ?? null,
        checkoutLongitude: longitude ?? null,
        countTime: newCountTime,
        status: "COMPLETED",
        updated: now,
      },
      { attendanceId: record.attendanceId }
    );

    return successResponse(res, { countTime: newCountTime }, "Checked out successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};
const getAttendanceStatus = async (req, res) => {
  try {
    const employeeId = req.employeeId;
    if (!employeeId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const rows = await selectWithJoins(
      "attendance",
      [],
      { employeeId, isCheckedIn: true, delete: 0 },
      ["attendanceId", "checkinDate", "lastCheckinTime", "countTime"],
      [["attendanceId", "DESC"]]
    );

    if (rows.length === 0) {
      return successResponse(res, { isCheckedIn: false, countTime: 0 }, "Status fetched");
    }

    const row = rows[0];
    return successResponse(
      res,
      {
        isCheckedIn: true,
        countTime: row.countTime || 0,           // is session shuru hone se pehle ka cumulative
        lastCheckinTime: row.lastCheckinTime,     // frontend isse live elapsed calculate karega
      },
      "Status fetched"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};
module.exports = {
  employeeLogin,
  employeeCheckout,
    getAttendanceStatus,
  getFinancialYears,
  getEmployeeProfile,
};