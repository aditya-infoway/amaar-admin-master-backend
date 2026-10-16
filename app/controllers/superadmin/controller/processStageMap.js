const { selectWithJoins } = require("../../../helper/index.js");
const db = require("../../../modelses");

// ============================================================
// Work Process screen ka data: process-wise status (workorderassignment se)
//
// Har process ke andar:
//   - pehle jaisa aggregate (status / employeeName / times)  -> purani screen na tootey
//   - NEW: subStages[]  -> us process ki har sub-process ki alag row
//
// Process status rule:
//   Completed   -> saari sub-processes Completed
//   In Progress -> koi bhi sub-process start ho chuki
//   Pending     -> koi start nahi hui
// ============================================================
const getProcessStageMap = async (workOrderIds, companyId) => {
  const map = new Map();
  const ids = [...new Set((workOrderIds || []).filter(Boolean))];
  if (!ids.length) return map;

  const rows = await db.workorderassignment.findAll({
    where: { companyId, workOrderId: ids, delete: 0 },
    raw: true,
  });
  if (!rows.length) return map;

  const processIds = [...new Set(rows.map((r) => r.processId))];
  const subIds = [
    ...new Set(rows.map((r) => r.subProcessId).filter(Boolean)),
  ];
  const empIds = [...new Set(rows.map((r) => r.contractorId))];

  const [processRows, subRows, employees] = await Promise.all([
    selectWithJoins(
      "main_process_detail",
      [],
      { processId: processIds, companyId, delete: 0 },
      ["processId", "processName"],
    ),
    subIds.length
      ? selectWithJoins(
          "sub_process",
          [],
          { subProcessId: subIds, delete: 0 },
          ["subProcessId", "subProcessName"],
        )
      : [],
    selectWithJoins(
      "employee",
      [],
      { employeeId: empIds },
      ["employeeId", "employeeName", "mobileNumber"],
    ),
  ]);

  const processName = new Map(
    processRows.map((p) => [Number(p.processId), p.processName]),
  );
  const subName = new Map(
    subRows.map((s) => [Number(s.subProcessId), s.subProcessName]),
  );
  const empById = new Map(employees.map((e) => [String(e.employeeId), e]));

  // workOrderId -> processId -> rows[]
  const grouped = new Map();
  rows.forEach((r) => {
    const w = String(r.workOrderId);
    if (!grouped.has(w)) grouped.set(w, new Map());
    const byProcess = grouped.get(w);
    const p = Number(r.processId);
    if (!byProcess.has(p)) byProcess.set(p, []);
    byProcess.get(p).push(r);
  });

  const toTime = (v) => (v ? new Date(v).getTime() : null);

  grouped.forEach((byProcess, w) => {
    const list = [];

    byProcess.forEach((g, pid) => {
      // sub-processes ko subProcessId order me rakho
      const sorted = [...g].sort(
        (a, b) => Number(a.subProcessId || 0) - Number(b.subProcessId || 0),
      );

      const allDone = sorted.every((x) => x.status === "Completed");
      const anyStarted = sorted.some((x) => x.status !== "Pending");
      const status = allDone
        ? "Completed"
        : anyStarted
          ? "In Progress"
          : "Pending";

      const names = [
        ...new Set(
          sorted
            .map((x) => empById.get(String(x.contractorId))?.employeeName)
            .filter(Boolean),
        ),
      ];
      const mobiles = [
        ...new Set(
          sorted
            .map((x) => empById.get(String(x.contractorId))?.mobileNumber)
            .filter(Boolean),
        ),
      ];

      const times = (key) =>
        sorted.map((x) => toTime(x[key])).filter((t) => t !== null);
      const starts = times("startTime");
      const ends = times("endTime");
      const created = times("created");

      // NEW: har sub-process ki alag row
      const subStages = sorted.map((x) => {
        const emp = empById.get(String(x.contractorId)) || {};
        return {
          id: x.workOrderAssignmentId,
          subProcessId: x.subProcessId || null,
          label: x.subProcessId ? subName.get(Number(x.subProcessId)) || "" : "",
          status: x.status,
          employeeName: emp.employeeName || "",
          employeeMobile: emp.mobileNumber || "",
          assignedAt: x.created || null,
          startTime: x.startTime || null,
          endTime: x.endTime || null,
        };
      });

      list.push({
        label: processName.get(pid) || "",
        order: pid,
        status,
        employeeName: names.join(", "),
        employeeMobile: mobiles.join(", "),
        assignedAt: created.length ? new Date(Math.min(...created)) : null,
        startTime: starts.length ? new Date(Math.min(...starts)) : null,
        endTime: allDone && ends.length ? new Date(Math.max(...ends)) : null,

        // NEW
        hasSubProcess: subStages.some((s) => s.subProcessId),
        completedCount: subStages.filter((s) => s.status === "Completed").length,
        totalCount: subStages.length,
        subStages,
      });
    });

    list.sort((a, b) => a.order - b.order);
    map.set(w, list);
  });

  return map;
};

module.exports = { getProcessStageMap };