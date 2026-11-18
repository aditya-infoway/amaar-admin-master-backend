const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

const plain = (r) => (r && r.toJSON ? r.toJSON() : r);

const getMainGroups = async (companyId) =>
  ((await selectWithJoins(
    "itemgroup", [], { companyId, delete: 0 },
    ["itemGroupId", "groupName", "itemCategoryId"]
  )) || []).map(plain);

const getSubGroups = async (companyId) =>
  ((await selectWithJoins(
    "subgroup", [], { companyId, delete: 0 },
    ["subGroupId", "companyId", "subGroupName", "groupId", "parentSubGroupId",
     "itemCategoryId", "status", "createdBy", "createdType", "created"],
    [["subGroupId", "DESC"]]
  )) || []).map(plain);

// Main group + sub group dono me name unique (case-insensitive)
const isNameTaken = (mains, subs, name, ignoreSubId = null) => {
  const n = name.trim().toLowerCase();
  if (mains.some((g) => String(g.groupName).trim().toLowerCase() === n)) return true;
  return subs.some(
    (s) =>
      String(s.subGroupName).trim().toLowerCase() === n &&
      String(s.subGroupId) !== String(ignoreSubId ?? "")
  );
};

const getDescendants = (subs, rootId) => {
  const out = [];
  const stack = [String(rootId)];
  while (stack.length) {
    const cur = stack.pop();
    subs.forEach((s) => {
      if (s.parentSubGroupId != null && String(s.parentSubGroupId) === cur) {
        out.push(s);
        stack.push(String(s.subGroupId));
      }
    });
  }
  return out;
};

const NAME_TAKEN_MSG =
  "Name already exists as a group or sub group. Please enter a different name.";

// ---------------- PARENTS (dropdown: main groups + sub groups) ----------------
const getParentOptions = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const mains = await getMainGroups(companyId);
    const subs = await getSubGroups(companyId);
    const mainMap = mains.reduce((a, g) => ((a[String(g.itemGroupId)] = g), a), {});

    const data = [
      ...mains.map((g) => ({
        id: `G-${g.itemGroupId}`,
        label: g.groupName,
        groupId: g.itemGroupId,
        parentSubGroupId: null,
        itemCategoryId: g.itemCategoryId,
      })),
      ...subs.map((s) => ({
        id: `S-${s.subGroupId}`,
        label: s.subGroupName,
        groupId: s.groupId,
        parentSubGroupId: s.subGroupId,
        itemCategoryId: s.itemCategoryId,
      })),
    ];

    return successResponse(res, data, "Parent options fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- CREATE ----------------
const createSubGroup = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { subGroupName, groupId, parentSubGroupId, status, createdBy, createdType } = req.body;
    const name = subGroupName.trim();

    const mains = await getMainGroups(companyId);
    const subs = await getSubGroups(companyId);

    const mainGroup = mains.find((g) => String(g.itemGroupId) === String(groupId));
    if (!mainGroup) return requiredmessage(res, "Selected group not found");

    if (parentSubGroupId) {
      const parentSub = subs.find((s) => String(s.subGroupId) === String(parentSubGroupId));
      if (!parentSub || String(parentSub.groupId) !== String(groupId)) {
        return requiredmessage(res, "Selected parent sub group not found");
      }
    }

    if (isNameTaken(mains, subs, name)) return errorResponse(res, NAME_TAKEN_MSG);

    const created = await saveModel("subgroup", {
      companyId,
      subGroupName: name,
      groupId: mainGroup.itemGroupId,
      parentSubGroupId: parentSubGroupId || null,
      itemCategoryId: mainGroup.itemCategoryId,
      createdBy,
      createdType,
      status,
      delete: 0,
    });

    return successResponse(res, created, "Sub group created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") return errorResponse(res, NAME_TAKEN_MSG);
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getSubGroupList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const mains = await getMainGroups(companyId);
    const subs = await getSubGroups(companyId);
    const mainMap = mains.reduce((a, g) => ((a[String(g.itemGroupId)] = g), a), {});
    const subMap = subs.reduce((a, s) => ((a[String(s.subGroupId)] = s), a), {});

    const ids = [...new Set(subs.map((s) => s.createdBy).filter(Boolean))];
    const creatorMap = {};
    if (ids.length) {
      const companies = await selectWithJoins("company", [], { companyId: ids, delete: 0 }, ["companyId", "companyName"]);
      (companies || []).forEach((c) => (creatorMap[String(c.companyId)] = c.companyName));
      const employees = await selectWithJoins("employee", [], { employeeId: ids, delete: 0 }, ["employeeId", "employeeName"]);
      (employees || []).forEach((e) => {
        if (!creatorMap[String(e.employeeId)]) creatorMap[String(e.employeeId)] = e.employeeName;
      });
    }

    const data = subs.map((s) => ({
      subGroupId: s.subGroupId,
      companyId: s.companyId,
      subGroupName: s.subGroupName,
      groupId: s.groupId,
      groupName: mainMap[String(s.groupId)]?.groupName || "",
      parentSubGroupId: s.parentSubGroupId,
      parentSubGroupName: subMap[String(s.parentSubGroupId)]?.subGroupName || "",
      itemCategoryId: s.itemCategoryId,
      status: s.status,
      createdBy: creatorMap[String(s.createdBy)] || s.createdBy,
      createdType: s.createdType,
      created: s.created,
    }));

    return successResponse(res, data, "Sub group list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateSubGroup = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { subGroupId, subGroupName, groupId, parentSubGroupId, status } = req.body;
    const name = subGroupName.trim();

    const mains = await getMainGroups(companyId);
    const subs = await getSubGroups(companyId);

    const existing = subs.find((s) => String(s.subGroupId) === String(subGroupId));
    if (!existing) return requiredmessage(res, "Sub group not found");

    const mainGroup = mains.find((g) => String(g.itemGroupId) === String(groupId));
    if (!mainGroup) return requiredmessage(res, "Selected group not found");

    if (parentSubGroupId) {
      if (String(parentSubGroupId) === String(subGroupId)) {
        return errorResponse(res, "A sub group cannot be its own parent.");
      }
      const parentSub = subs.find((s) => String(s.subGroupId) === String(parentSubGroupId));
      if (!parentSub || String(parentSub.groupId) !== String(groupId)) {
        return requiredmessage(res, "Selected parent sub group not found");
      }
      if (getDescendants(subs, subGroupId).some((d) => String(d.subGroupId) === String(parentSubGroupId))) {
        return errorResponse(res, "Cannot move a sub group under its own child.");
      }
    }

    if (isNameTaken(mains, subs, name, subGroupId)) return errorResponse(res, NAME_TAKEN_MSG);

    await updateModelHelper(
      "subgroup",
      {
        subGroupName: name,
        groupId: mainGroup.itemGroupId,
        parentSubGroupId: parentSubGroupId || null,
        itemCategoryId: mainGroup.itemCategoryId,
        status,
        updated: new Date(),
      },
      { subGroupId, companyId }
    );

    return successResponse(res, {}, "Sub group updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") return errorResponse(res, NAME_TAKEN_MSG);
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft) ----------------
const deleteSubGroup = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { subGroupId } = req.body;
    const subs = await getSubGroups(companyId);

    if (!subs.some((s) => String(s.subGroupId) === String(subGroupId))) {
      return requiredmessage(res, "Sub group not found");
    }
    if (subs.some((s) => s.parentSubGroupId != null && String(s.parentSubGroupId) === String(subGroupId))) {
      return errorResponse(res, "This sub group has child sub groups. Delete them first.");
    }

    await updateModelHelper(
      "subgroup",
      { delete: 1, updated: new Date() },
      { subGroupId, companyId }
    );

    return successResponse(res, {}, "Sub group deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  getParentOptions,
  createSubGroup,
  getSubGroupList,
  updateSubGroup,
  deleteSubGroup,
};