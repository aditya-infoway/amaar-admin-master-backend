const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ---------------- CREATE ----------------
const createCreateMaster = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      type,
      description,
      actualItem,
      exShowroom,
      effectiveDate,
      status,
    } = req.body;

    const typeExists = await selectWithJoins(
      "createmaster",
      [],
      {
        type: type.trim(),
        companyId,
        delete: 0,
      },
      ["createMasterId"]
    );

 

    const payload = {
      companyId,
      type: type.trim(),
      description: description.trim(),
      actualItem,
      exShowroom,
      effectiveDate,
      status,
      delete: 0,
    };

    const createMaster = await saveModel("createmaster", payload);

    return successResponse(
      res,
      createMaster,
      "Create master created successfully"
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(
        res,
        "Create master type already exists. Please enter a different type."
      );
    }

    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getCreateMasterList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "createmaster",
      [],
      {
        companyId,
        delete: 0,
      },
      [
        "createMasterId",
        "companyId",
        "type",
        "description",
        "actualItem",
        "exShowroom",
        "effectiveDate",
        "status",
        "created",
      ],
      [["createMasterId", "DESC"]]
    );

    return successResponse(
      res,
      list,
      "Create master list fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getCreateMasterById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "createmaster",
      [],
      {
        createMasterId: id,
        companyId,
        delete: 0,
      },
      [
        "createMasterId",
        "companyId",
        "type",
        "description",
        "actualItem",
        "exShowroom",
        "effectiveDate",
        "status",
        "created",
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Create master not found");
    }

    return successResponse(
      res,
      rows[0],
      "Create master fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateCreateMaster = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      createMasterId,
      type,
      description,
      actualItem,
      exShowroom,
      effectiveDate,
      status,
    } = req.body;

    const existing = await selectWithJoins(
      "createmaster",
      [],
      {
        createMasterId,
        companyId,
        delete: 0,
      },
      ["createMasterId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Create master not found");
    }

    const typeExists = await selectWithJoins(
      "createmaster",
      [],
      {
        type: type.trim(),
        companyId,
        delete: 0,
      },
      ["createMasterId"]
    );

    const typeTakenByOther = typeExists.some(
      (row) =>
        String(row.createMasterId) !== String(createMasterId)
    );

 

    await updateModelHelper(
      "createmaster",
      {
        type: type.trim(),
        description: description.trim(),
        actualItem,
        exShowroom,
        effectiveDate,
        status,
        updated: new Date(),
      },
      {
        createMasterId,
        companyId,
      }
    );

    return successResponse(
      res,
      {},
      "Create master updated successfully"
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(
        res,
        "Create master type already exists. Please enter a different type."
      );
    }

    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteCreateMaster = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { createMasterId } = req.body;

    const existing = await selectWithJoins(
      "createmaster",
      [],
      {
        createMasterId,
        companyId,
        delete: 0,
      },
      ["createMasterId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Create master not found");
    }

    await updateModelHelper(
      "createmaster",
      {
        delete: 1,
        updated: new Date(),
      },
      {
        createMasterId,
        companyId,
      }
    );

    return successResponse(
      res,
      {},
      "Create master deleted successfully"
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createCreateMaster,
  getCreateMasterList,
  getCreateMasterById,
  updateCreateMaster,
  deleteCreateMaster,
};