const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createProfession = async (req, res) => {
  try {
    const companyId = req.companyId; // superAdminAuth se milega

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { professionName, status } = req.body;

    // professionName company-wise unique honi chahiye
    const nameExists = await selectWithJoins(
      "profession",
      [],
      { professionName: professionName.trim(), companyId, delete: 0 },
      ["professionId"]
    );

    if (nameExists.length > 0) {
      return errorResponse(res, "Profession already exists. Please enter a different name.");
    }

    const payload = {
      companyId,
      professionName: professionName.trim(),
      status,
      delete: 0,
    };

    const profession = await saveModel("profession", payload);

    return successResponse(res, profession, "Profession created successfully");
  } catch (error) {
    // DB level unique constraint bhi catch karo (race condition safety)
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Profession already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getProfessionList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "profession",
      [],
      { companyId, delete: 0 },
      ["professionId", "companyId", "professionName", "status", "created"],
      [["professionId", "DESC"]]
    );

    return successResponse(res, list, "Profession list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getProfessionById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "profession",
      [],
      { professionId: id, companyId, delete: 0 },
      ["professionId", "companyId", "professionName", "status", "created"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Profession not found");
    }

    return successResponse(res, rows[0], "Profession fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateProfession = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { professionId, professionName, status } = req.body;

    const existing = await selectWithJoins(
      "profession",
      [],
      { professionId, companyId, delete: 0 },
      ["professionId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Profession not found");
    }

    // professionName uniqueness check — same record ke alawa koi aur is naam se na ho
    const nameExists = await selectWithJoins(
      "profession",
      [],
      { professionName: professionName.trim(), companyId, delete: 0 },
      ["professionId"]
    );

    const nameTakenByOther = nameExists.some(
      (row) => String(row.professionId) !== String(professionId)
    );

    if (nameTakenByOther) {
      return errorResponse(res, "Profession already exists. Please enter a different name.");
    }

    await updateModelHelper(
      "profession",
      {
        professionName: professionName.trim(),
        status,
        updated: new Date(),
      },
      { professionId, companyId }
    );

    return successResponse(res, {}, "Profession updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "Profession already exists. Please enter a different name.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteProfession = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { professionId } = req.body;

    const existing = await selectWithJoins(
      "profession",
      [],
      { professionId, companyId, delete: 0 },
      ["professionId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Profession not found");
    }

    await updateModelHelper(
      "profession",
      { delete: 1, updated: new Date() },
      { professionId, companyId }
    );

    return successResponse(res, {}, "Profession deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createProfession,
  getProfessionList,
  getProfessionById,
  updateProfession,
  deleteProfession,
};