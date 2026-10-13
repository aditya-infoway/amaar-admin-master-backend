const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

const toPlain = (row) => (row && row.toJSON ? row.toJSON() : row);

// createdBy id -> name (Super Admin = company, baaki = employee)
const attachCreatedByName = async (rows) => {
  const companyIds = [];
  const employeeIds = [];

  rows.forEach((r) => {
    if (!r.createdBy) return;
    if (r.createdType === "Super Admin") companyIds.push(r.createdBy);
    else employeeIds.push(r.createdBy);
  });

  let companyMap = {};
  if (companyIds.length > 0) {
    const companies = await selectWithJoins(
      "company",
      [],
      { companyId: [...new Set(companyIds)], delete: 0 },
      ["companyId", "companyName"]
    );
    companyMap = (companies || []).reduce((acc, c) => {
      acc[String(c.companyId)] = c.companyName;
      return acc;
    }, {});
  }

  let employeeMap = {};
  if (employeeIds.length > 0) {
    const employees = await selectWithJoins(
      "employee",
      [],
      { employeeId: [...new Set(employeeIds)], delete: 0 },
      ["employeeId", "employeeName"]
    );
    employeeMap = (employees || []).reduce((acc, e) => {
      acc[String(e.employeeId)] = e.employeeName;
      return acc;
    }, {});
  }

  return rows.map((r) => ({
    ...r,
    createdByName:
      r.createdType === "Super Admin"
        ? companyMap[String(r.createdBy)] || ""
        : employeeMap[String(r.createdBy)] || "",
  }));
};

// Rules: process exist + main process Active, code unique (company), serial (process me unique + 1,2,3 continuous)
const validateRules = async ({ companyId, processId, subProcessCode, serialNo, excludeId }) => {
  const proc = await selectWithJoins(
    "main_process_detail",
    [],
    { processId, companyId, delete: 0 },
    ["processId", "mainProcessId"]
  );
  if (proc.length === 0) return "Selected process not found.";

  const main = await selectWithJoins(
    "main_process",
    [],
    { mainProcessId: toPlain(proc[0]).mainProcessId, companyId, delete: 0 },
    ["mainProcessId", "status"]
  );
  if (main.length === 0 || toPlain(main[0]).status !== "Active") {
    return "Selected process belongs to an inactive Main Process.";
  }

  const rows = (
    await selectWithJoins(
      "sub_process",
      [],
      { companyId, delete: 0 },
      ["subProcessId", "processId", "subProcessCode", "serialNo"]
    )
  )
    .map(toPlain)
    .filter((r) => String(r.subProcessId) !== String(excludeId || ""));

  const code = String(subProcessCode).trim().toLowerCase();
  if (rows.some((r) => String(r.subProcessCode).trim().toLowerCase() === code)) {
    return `Sub Process Code ${subProcessCode} already exists.`;
  }

  const used = new Set(
    rows
      .filter((r) => String(r.processId) === String(processId))
      .map((r) => Number(r.serialNo))
  );
  if (used.has(Number(serialNo))) {
    return `Serial No ${serialNo} is already used for this process.`;
  }

  let expected = 1;
  while (used.has(expected)) expected++;
  if (Number(serialNo) > expected) {
    return `Serial No ${expected} is pending. Please add Serial No ${expected} first.`;
  }

  return null;
};

// ---------------- CREATE ----------------
const createSubProcess = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      financialYearId,
      processId,
      subProcessName,
      subProcessCode,
      serialNo,
      createdBy,
      createdType,
    } = req.body;

    const ruleError = await validateRules({ companyId, processId, subProcessCode, serialNo });
    if (ruleError) return errorResponse(res, ruleError);

    const row = await saveModel("sub_process", {
      companyId,
      financialYearId: financialYearId || null,
      processId,
      subProcessName: subProcessName.trim(),
      subProcessCode: subProcessCode.trim(),
      serialNo: Number(serialNo),
      status: "Active",
      createdBy: createdBy || 0,
      createdType: createdType || null,
      delete: 0,
    });

    return successResponse(
      res,
      { subProcessId: row.subProcessId },
      "Sub process created successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getSubProcessList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = Number(financialYearId);

    const list = await selectWithJoins(
      "sub_process",
      [],
      where,
      [
        "subProcessId",
        "financialYearId",
        "processId",
        "subProcessName",
        "subProcessCode",
        "serialNo",
        "status",
        "createdBy",
        "createdType",
        "created",
      ],
      [["subProcessId", "DESC"]]
    );

    const rows = (list || []).map(toPlain);

    // process -> main process (naam + status) map
    const processIds = [...new Set(rows.map((r) => r.processId))];
    let processMap = {};

    if (processIds.length > 0) {
      const details = (
        await selectWithJoins(
          "main_process_detail",
          [],
          { processId: processIds },
          ["processId", "mainProcessId", "processName"]
        )
      ).map(toPlain);

      const mainIds = [...new Set(details.map((d) => d.mainProcessId))];
      let mainMap = {};
      if (mainIds.length > 0) {
        const mains = (
          await selectWithJoins(
            "main_process",
            [],
            { mainProcessId: mainIds },
            ["mainProcessId", "mainProcess", "status"]
          )
        ).map(toPlain);
        mainMap = mains.reduce((acc, m) => {
          acc[String(m.mainProcessId)] = m;
          return acc;
        }, {});
      }

      processMap = details.reduce((acc, d) => {
        const m = mainMap[String(d.mainProcessId)];
        acc[String(d.processId)] = {
          processName: d.processName,
          mainProcess: m?.mainProcess || "",
          mainStatus: m?.status || "",
        };
        return acc;
      }, {});
    }

    // Inactive main process ke sub process list me nahi dikhane
    const visible = rows.filter(
      (r) => processMap[String(r.processId)]?.mainStatus === "Active"
    );

    const withNames = await attachCreatedByName(visible);

    const data = withNames.map((r) => ({
      id: r.subProcessId,
      financialYearId: r.financialYearId,
      processId: r.processId,
      processName: processMap[String(r.processId)]?.processName || "",
      mainProcess: processMap[String(r.processId)]?.mainProcess || "",
      subProcessName: r.subProcessName,
      subProcessCode: r.subProcessCode,
      serialNo: r.serialNo,
      status: r.status,
      createdBy: r.createdBy,
      createdType: r.createdType,
      createdByName: r.createdByName,
      createdAt: r.created,
    }));

    return successResponse(res, data, "Sub process list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateSubProcess = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;
    const { processId, subProcessName, subProcessCode, serialNo } = req.body;

    const existing = await selectWithJoins(
      "sub_process",
      [],
      { subProcessId: id, companyId, delete: 0 },
      ["subProcessId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Sub process not found");

    const ruleError = await validateRules({
      companyId,
      processId,
      subProcessCode,
      serialNo,
      excludeId: id,
    });
    if (ruleError) return errorResponse(res, ruleError);

    await updateModelHelper(
      "sub_process",
      {
        processId,
        subProcessName: subProcessName.trim(),
        subProcessCode: subProcessCode.trim(),
        serialNo: Number(serialNo),
        updated: new Date(),
      },
      { subProcessId: id, companyId }
    );

    return successResponse(res, {}, "Sub process updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- STATUS TOGGLE ----------------
const updateSubProcessStatus = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;
    const { status } = req.body;

    const existing = await selectWithJoins(
      "sub_process",
      [],
      { subProcessId: id, companyId, delete: 0 },
      ["subProcessId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Sub process not found");

    await updateModelHelper(
      "sub_process",
      { status: status ? "Active" : "Inactive", updated: new Date() },
      { subProcessId: id, companyId }
    );

    return successResponse(res, {}, "Status updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteSubProcess = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const existing = await selectWithJoins(
      "sub_process",
      [],
      { subProcessId: id, companyId, delete: 0 },
      ["subProcessId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Sub process not found");

    await updateModelHelper(
      "sub_process",
      { delete: 1, updated: new Date() },
      { subProcessId: id, companyId }
    );

    return successResponse(res, {}, "Sub process deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createSubProcess,
  getSubProcessList,
  updateSubProcess,
  updateSubProcessStatus,
  deleteSubProcess,
};