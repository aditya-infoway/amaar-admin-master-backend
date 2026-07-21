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
      employeeName,
      mobileNumber,
      alternateNumber,
      email,
      password,
    } = req.body;

    // role exists aur usi department ka hona chahiye
    const roleExists = await selectWithJoins(
      "role",
      [],
      { roleId, department, delete: 0 },
      ["roleId"]
    );

    if (roleExists.length === 0) {
      return errorResponse(res, "Selected role not found for this department");
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
      createdBy: companyId,
      createdType: "Super Admin",
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

    const data = (list || []).map((row) => ({
      ...row.toJSON ? row.toJSON() : row,
      createdBy: companyMap[String(row.createdBy)] || row.createdBy,
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
      ["roleId"]
    );

    if (roleExists.length === 0) {
      return errorResponse(res, "Selected role not found for this department");
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

module.exports = {
  createEmployee,
  getEmployeeList,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};