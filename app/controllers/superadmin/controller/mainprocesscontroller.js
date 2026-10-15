const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

const toPlain = (row) => (row && row.toJSON ? row.toJSON() : row);

// payload ke andar duplicate serial check
const checkDuplicateSerials = (processes = []) => {
  const serials = new Set();

  for (const p of processes) {
    const serial = String(p.serialNo);
    if (serials.has(serial)) return `Duplicate Serial No: ${p.serialNo}`;
    serials.add(serial);
  }
  return null;
};

// serial no 1 se continuous hona chahiye (1,2,3...)
const checkSerialSequence = (processes = []) => {
  const serials = processes
    .map((p) => Number(p.serialNo))
    .sort((a, b) => a - b);

  for (let i = 0; i < serials.length; i++) {
    if (serials[i] !== i + 1) {
      return `Serial No ${i + 1} is pending. Please add Serial No ${i + 1} first.`;
    }
  }
  return null;
};

// ---------- PROCESS CODE GENERATION (001, 002, ...) ----------
const formatProcessCode = (num) => String(num).padStart(3, "0");

// DB se company ka sabse bada generated code (deleted rows bhi count, taaki code reuse na ho)
const getLastCodeNumber = async (companyId) => {
  const rows = await selectWithJoins(
    "main_process_detail",
    [],
    { companyId },
    ["processId", "processCode"]
  );

  let max = 0;
  (rows || []).map(toPlain).forEach((r) => {
    const code = String(r.processCode || "").trim();
    // sirf 3-digit generated codes (001-999) count karo, purane random codes ignore
    if (!/^\d{3}$/.test(code)) return;
    const n = parseInt(code, 10);
    if (n > max) max = n;
  });
  return max;
};

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

// detail rows ko frontend shape me convert
const formatDetail = (d) => ({
  id: d.processId,
  processCode: d.processCode,
  processName: d.processName,
  serialNo: d.serialNo,
});

// ---------------- CREATE ----------------
const createMainProcess = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId, mainProcess, processes, createdBy, createdType } = req.body;

    const dupError = checkDuplicateSerials(processes);
    if (dupError) return errorResponse(res, dupError);

    const serialError = checkSerialSequence(processes);
    if (serialError) return errorResponse(res, serialError);

    const exists = await selectWithJoins(
      "main_process",
      [],
      { companyId, mainProcess: mainProcess.trim(), delete: 0 },
      ["mainProcessId"]
    );
    if (exists.length > 0) {
      return errorResponse(res, "Main Process already exists.");
    }

    const main = await saveModel("main_process", {
      companyId,
      financialYearId: financialYearId || null,
      mainProcess: mainProcess.trim(),
      status: "Inactive",
      createdBy: createdBy || 0,
      createdType: createdType || null,
      delete: 0,
    });

    // DB check karke serial order me code assign: 001, 002 ...
    let lastCode = await getLastCodeNumber(companyId);
    const sorted = [...processes].sort(
      (a, b) => Number(a.serialNo) - Number(b.serialNo)
    );

    for (const p of sorted) {
      lastCode += 1;
      await saveModel("main_process_detail", {
        mainProcessId: main.mainProcessId,
        companyId,
        processCode: formatProcessCode(lastCode),
        processName: p.processName.trim(),
        serialNo: Number(p.serialNo),
        delete: 0,
      });
    }

    return successResponse(
      res,
      { mainProcessId: main.mainProcessId },
      "Main process created successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getMainProcessList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;

    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = Number(financialYearId);

    const list = await selectWithJoins(
      "main_process",
      [],
      where,
      [
        "mainProcessId",
        "financialYearId",
        "mainProcess",
        "status",
        "createdBy",
        "createdType",
        "created",
      ],
      [["mainProcessId", "DESC"]]
    );

    const rows = (list || []).map(toPlain);
    const ids = rows.map((r) => r.mainProcessId);

    let detailMap = {};
    if (ids.length > 0) {
      const details = await selectWithJoins(
        "main_process_detail",
        [],
        { mainProcessId: ids, delete: 0 },
        ["processId", "mainProcessId", "processCode", "processName", "serialNo"],
        [["serialNo", "ASC"]]
      );

      (details || []).map(toPlain).forEach((d) => {
        const key = String(d.mainProcessId);
        if (!detailMap[key]) detailMap[key] = [];
        detailMap[key].push(formatDetail(d));
      });
    }

    const withNames = await attachCreatedByName(rows);

    const data = withNames.map((r) => ({
      id: r.mainProcessId,
      financialYearId: r.financialYearId,
      mainProcess: r.mainProcess,
      status: r.status,
      createdBy: r.createdBy,
      createdType: r.createdType,
      createdByName: r.createdByName,
      createdAt: r.created,
      processes: detailMap[String(r.mainProcessId)] || [],
    }));

    return successResponse(res, data, "Main process list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getMainProcessById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const rows = await selectWithJoins(
      "main_process",
      [],
      { mainProcessId: id, companyId, delete: 0 },
      ["mainProcessId", "financialYearId", "mainProcess", "status", "createdBy", "createdType", "created"]
    );

    if (rows.length === 0) return requiredmessage(res, "Main process not found");

    const main = toPlain(rows[0]);

    const details = await selectWithJoins(
      "main_process_detail",
      [],
      { mainProcessId: id, delete: 0 },
      ["processId", "processCode", "processName", "serialNo"],
      [["serialNo", "ASC"]]
    );

    const [withName] = await attachCreatedByName([main]);

    return successResponse(
      res,
      {
        id: main.mainProcessId,
        financialYearId: main.financialYearId,
        mainProcess: main.mainProcess,
        status: main.status,
        createdBy: main.createdBy,
        createdType: main.createdType,
        createdByName: withName.createdByName,
        createdAt: main.created,
        processes: (details || []).map(toPlain).map(formatDetail),
      },
      "Main process fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateMainProcess = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;
    const { mainProcess, processes } = req.body;

    const existing = await selectWithJoins(
      "main_process",
      [],
      { mainProcessId: id, companyId, delete: 0 },
      ["mainProcessId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Main process not found");

    const dupError = checkDuplicateSerials(processes);
    if (dupError) return errorResponse(res, dupError);

    const serialError = checkSerialSequence(processes);
    if (serialError) return errorResponse(res, serialError);

    // same naam kisi dusre record pe na ho
    const nameExists = await selectWithJoins(
      "main_process",
      [],
      { companyId, mainProcess: mainProcess.trim(), delete: 0 },
      ["mainProcessId"]
    );
    if (nameExists.some((r) => String(r.mainProcessId) !== String(id))) {
      return errorResponse(res, "Main Process already exists.");
    }

    await updateModelHelper(
      "main_process",
      { mainProcess: mainProcess.trim(), updated: new Date() },
      { mainProcessId: id, companyId }
    );

    // purani detail rows
    const oldDetails = await selectWithJoins(
      "main_process_detail",
      [],
      { mainProcessId: id, delete: 0 },
      ["processId"]
    );
    const oldIds = (oldDetails || []).map((d) => String(d.processId));
    const incomingIds = processes.filter((p) => p.id).map((p) => String(p.id));

    // jo ab payload me nahi hain -> soft delete
    for (const oldId of oldIds) {
      if (!incomingIds.includes(oldId)) {
        await updateModelHelper(
          "main_process_detail",
          { delete: 1, updated: new Date() },
          { processId: oldId, mainProcessId: id }
        );
      }
    }

    let lastCode = await getLastCodeNumber(companyId);
    const sorted = [...processes].sort(
      (a, b) => Number(a.serialNo) - Number(b.serialNo)
    );

    for (const p of sorted) {
      if (p.id && oldIds.includes(String(p.id))) {
        // purani row: processCode touch nahi karna
        await updateModelHelper(
          "main_process_detail",
          {
            processName: p.processName.trim(),
            serialNo: Number(p.serialNo),
            updated: new Date(),
          },
          { processId: p.id, mainProcessId: id }
        );
      } else {
        // nayi row: next code
        lastCode += 1;
        await saveModel("main_process_detail", {
          mainProcessId: id,
          companyId,
          processCode: formatProcessCode(lastCode),
          processName: p.processName.trim(),
          serialNo: Number(p.serialNo),
          delete: 0,
        });
      }
    }

    return successResponse(res, {}, "Main process updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- STATUS TOGGLE ----------------
const updateMainProcessStatus = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;
    const { status } = req.body;

    const existing = await selectWithJoins(
      "main_process",
      [],
      { mainProcessId: id, companyId, delete: 0 },
      ["mainProcessId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Main process not found");

    // Active karne se pehle check: koi dusra main process already Active to nahi?
    if (status) {
      const activeRows = (
        await selectWithJoins(
          "main_process",
          [],
          { companyId, status: "Active", delete: 0 },
          ["mainProcessId", "mainProcess"]
        )
      )
        .map(toPlain)
        .filter((r) => String(r.mainProcessId) !== String(id));

      if (activeRows.length > 0) {
        return errorResponse(
          res,
          `"${activeRows[0].mainProcess}" is already Active. Please make it Inactive first.`
        );
      }
    }

    await updateModelHelper(
      "main_process",
      { status: status ? "Active" : "Inactive", updated: new Date() },
      { mainProcessId: id, companyId }
    );

    return successResponse(res, {}, "Status updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteMainProcess = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const existing = await selectWithJoins(
      "main_process",
      [],
      { mainProcessId: id, companyId, delete: 0 },
      ["mainProcessId"]
    );
    if (existing.length === 0) return requiredmessage(res, "Main process not found");

    await updateModelHelper(
      "main_process",
      { delete: 1, updated: new Date() },
      { mainProcessId: id, companyId }
    );
    await updateModelHelper(
      "main_process_detail",
      { delete: 1, updated: new Date() },
      { mainProcessId: id, companyId }
    );

    return successResponse(res, {}, "Main process deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- NEXT CODE (drawer ke input ke liye) ----------------
const getNextProcessCode = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const last = await getLastCodeNumber(companyId);
    return successResponse(
      res,
      { nextCode: formatProcessCode(last + 1) },
      "Next process code fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createMainProcess,
  getMainProcessList,
  getMainProcessById,
  updateMainProcess,
  updateMainProcessStatus,
  deleteMainProcess,
  getNextProcessCode,
};