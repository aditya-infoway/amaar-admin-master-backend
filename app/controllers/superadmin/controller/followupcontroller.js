const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- date helpers ----------------
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function computeBucket(lead, latestFollowUp) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);

  if (
    latestFollowUp &&
    latestFollowUp.created &&
    startOfDay(new Date(latestFollowUp.created)).getTime() === today.getTime()
  ) {
    return "Attend";
  }

  const refDateRaw = latestFollowUp?.nextScheduledDate || lead.nextFollowupDate;
  if (!refDateRaw) return "Pending";

  const refDay = startOfDay(new Date(refDateRaw));

  if (refDay.getTime() === today.getTime()) return "Pending";

  if (refDay.getTime() < today.getTime()) {
    if (refDay.getTime() >= monthStart.getTime()) return "Delay";
    return null;
  }

  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  if (refDay.getTime() <= sevenDaysOut.getTime()) return "Upcoming";

  return null;
}

// ---------------- createdBy -> naam resolve karo ----------------
// createdType === "Super Admin"  -> company table se (companyId -> companyName)
// baaki sab (Sale Executive, Manager, etc.) -> employee table se (employeeId -> employeeName)
// NOTE: column names apne schema ke hisaab se yahan adjust kar lena.
async function resolveCreatedByNames(records) {
  const companyIds = new Set();
  const employeeIds = new Set();

  for (const r of records) {
    if (!r || !r.createdBy) continue;
    if (r.createdType === "Super Admin") companyIds.add(r.createdBy);
    else employeeIds.add(r.createdBy);
  }

  const companyMap = {};
  const employeeMap = {};

  await Promise.all(
    [...companyIds].map(async (id) => {
      const rows = await selectWithJoins(
        "company", [], { companyId: id }, ["companyId", "companyName"]
      );
      if (rows[0]) companyMap[id] = rows[0].companyName;
    })
  );

  await Promise.all(
    [...employeeIds].map(async (id) => {
      const rows = await selectWithJoins(
        "employee", [], { employeeId: id }, ["employeeId", "employeeName"]
      );
      if (rows[0]) employeeMap[id] = rows[0].employeeName;
    })
  );

  // caller ko ek lookup function milega
  return (createdBy, createdType) => {
    if (!createdBy) return null;
    return createdType === "Super Admin"
      ? companyMap[createdBy] || null
      : employeeMap[createdBy] || null;
  };
}

// Lead na hone par "New" wala virtual followup object banata hai
function buildVirtualNewFollowup(lead) {
  return {
    id: lead.leadId,
    leadId: lead.leadId,
    nextScheduledDate: lead.nextFollowupDate,
    callTime: null,
    callResponse: "New",
    discussion: null,
    followupCount: 0,
    createdBy: lead.createdBy,
    createdType: lead.createdType,
    createdByName: lead.createdByName,
    created: null,
  };
}

// ---------------- CREATE FOLLOWUP ----------------
const createFollowUp = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      leadId, nextScheduledDate, callTime, callResponse, discussion, createdBy, createdType,
    } = req.body;

    if (!leadId) return requiredmessage(res, "Lead Id is required");

    const leadRows = await selectWithJoins(
      "lead", [], { leadId, companyId, delete: 0 }, ["leadId"]
    );
    if (leadRows.length === 0) return requiredmessage(res, "Enquiry not found");

    const existingFollowups = await selectWithJoins(
      "followup", [], { leadId, companyId }, ["id"]
    );

    const payload = {
      leadId,
      companyId,
      nextScheduledDate: nextScheduledDate ? new Date(nextScheduledDate) : null,
      callTime: callTime || null,
      callResponse: callResponse || null,
      discussion: discussion || null,
      followupCount: existingFollowups.length + 1,
      // Lead create jaisa hi pattern — frontend se aaya createdBy/createdType save hoga
      createdBy: createdBy || req.employeeId || null,
      createdType: createdType || req.employeeType || null,
    };

    const followup = await saveModel("followup", payload);

    const leadUpdatePayload = { updated: new Date() };
    if (nextScheduledDate) {
      leadUpdatePayload.nextFollowupDate = new Date(nextScheduledDate).toISOString().split("T")[0];
    }
    await updateModelHelper("lead", leadUpdatePayload, { leadId, companyId });

    return successResponse(res, followup, "Follow-up added successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- FULL HISTORY (lead + followups) ----------------
const getFollowUpsByLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { leadId } = req.params;

    const leadRows = await selectWithJoins(
      "lead", [], { leadId, companyId, delete: 0 },
      ["leadId", "leadCode", "name", "number", "email", "address", "city", "model", "nextFollowupDate", "createdBy", "createdType"]
    );
    if (leadRows.length === 0) return requiredmessage(res, "Enquiry not found");
    const lead = leadRows[0];

    const followups = await selectWithJoins(
      "followup", [], { leadId, companyId },
      ["id", "leadId", "nextScheduledDate", "callTime", "callResponse", "discussion", "followupCount", "createdBy", "createdType", "created"],
      [["created", "DESC"]]
    );

    const nameLookup = await resolveCreatedByNames([lead, ...followups]);
    lead.createdByName = nameLookup(lead.createdBy, lead.createdType);
    followups.forEach((f) => { f.createdByName = nameLookup(f.createdBy, f.createdType); });

    return successResponse(res, { followups, lead }, "Follow-up history fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LATEST FOLLOWUP (kanban card ke "New" default ke liye) ----------------
const getLatestFollowUpByLead = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { leadId } = req.params;

    const leadRows = await selectWithJoins(
      "lead", [], { leadId, companyId, delete: 0 },
      ["leadId", "leadCode", "name", "number", "email", "address", "city", "model", "nextFollowupDate", "createdBy", "createdType"]
    );
    if (leadRows.length === 0) return requiredmessage(res, "Enquiry not found");
    const lead = leadRows[0];

    const followups = await selectWithJoins(
      "followup", [], { leadId, companyId },
      ["id", "leadId", "nextScheduledDate", "callTime", "callResponse", "discussion", "followupCount", "createdBy", "createdType", "created"],
      [["created", "DESC"]]
    );
    const latest = followups.slice(0, 1);

    const nameLookup = await resolveCreatedByNames([lead, ...latest]);
    lead.createdByName = nameLookup(lead.createdBy, lead.createdType);
    latest.forEach((f) => { f.createdByName = nameLookup(f.createdBy, f.createdType); });

    // Koi followup nahi hua -> "New" virtual entry, lead ki hi createdBy/date se
    const resultFollowups = latest.length > 0 ? latest : [buildVirtualNewFollowup(lead)];

    return successResponse(res, { followups: resultFollowups, lead }, "Latest follow-up fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- BOARD (Pending / Attend / Delay / Upcoming) ----------------
const getFollowUpBoard = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const leads = await selectWithJoins(
      "lead", [], { companyId, delete: 0 },
      ["leadId", "leadCode", "name", "number", "email", "city", "model", "nextFollowupDate", "createdBy", "createdType", "created"],
      [["leadId", "DESC"]]
    );

    const allFollowups = await selectWithJoins(
      "followup", [], { companyId },
      ["id", "leadId", "nextScheduledDate", "callTime", "callResponse", "discussion", "followupCount", "createdBy", "createdType", "created"],
      [["created", "DESC"]]
    );

    const nameLookup = await resolveCreatedByNames([...leads, ...allFollowups]);

    const followupsByLead = {};
    for (const f of allFollowups) {
      f.createdByName = nameLookup(f.createdBy, f.createdType);
      if (!followupsByLead[f.leadId]) followupsByLead[f.leadId] = [];
      followupsByLead[f.leadId].push(f);
    }

    const board = { Pending: [], Attend: [], Delay: [], Upcoming: [] };

    for (const lead of leads) {
      lead.createdByName = nameLookup(lead.createdBy, lead.createdType);

      const leadFollowups = followupsByLead[lead.leadId] || [];
      const latestFollowUp = leadFollowups[0] || null;
      const bucket = computeBucket(lead, latestFollowUp);
      if (!bucket) continue;

      const effectiveLatest = latestFollowUp || buildVirtualNewFollowup(lead);

      board[bucket].push({
        ...lead,
        latestFollowUp: effectiveLatest,
        followupCount: leadFollowups.length,
      });
    }

    return successResponse(res, board, "Follow-up board fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createFollowUp,
  getFollowUpsByLead,
  getLatestFollowUpByLead,
  getFollowUpBoard,
};