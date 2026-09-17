const {
  errorResponse,
  successResponse,
  requiredmessage,
  selectWithJoins,
  getBlobTempPublicUrl,
} = require("../../../helper/index.js");

// ---- Get company from employee token (jaisa logincontroller.js me hai) ----
const getEmployeeCompanyIdFromToken = async (req) => {
  const token = req.headers["x-token"] || req.headers["X-Token"] || "";

  if (!token) return null;

  const employeeRows = await selectWithJoins(
    "employee",
    [],
    { token, delete: 0 },
    ["companyId"]
  );

  if (employeeRows.length === 0) return null;

  return employeeRows[0].companyId;
};

// ---- LIST: sab attendance records (company-wise) ----
const getAttendanceList = async (req, res) => {
  try {
    const companyId = await getEmployeeCompanyIdFromToken(req);

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "attendance",
      [],
      { companyId, delete: 0 },
      [
        "attendanceId",
        "employeeId",
        "employeeName",
        "checkinDate",
        "checkinTime",
        "checkinPhoto",
        "checkinLatitude",
        "checkinLongitude",
        "checkoutTime",
        "checkoutPhoto",
        "checkoutLatitude",
        "checkoutLongitude",
        "countTime",
        "status",
      ],
      [["attendanceId", "DESC"]]
    );

    const data = (list || []).map((row) => {
      const plainRow = row.toJSON ? row.toJSON() : row;
      return {
        ...plainRow,
        // ✅ agar photo relative path hai to public URL bana do (jaisa company logo ke liye hota hai)
        checkinPhoto: plainRow.checkinPhoto
          ? getBlobTempPublicUrl(plainRow.checkinPhoto)
          : "",
        checkoutPhoto: plainRow.checkoutPhoto
          ? getBlobTempPublicUrl(plainRow.checkoutPhoto)
          : "",
      };
    });

    return successResponse(res, data, "Attendance list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  getAttendanceList,
};