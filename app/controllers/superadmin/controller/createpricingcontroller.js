const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

// ============================================================
// CREATE PRICING
// ============================================================

const createCreatePricing = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { code, description, effectiveDate, exShowroomPrice } = req.body;

    // --------------------------------------------------------
    // CHECK CODE DUPLICATE
    // --------------------------------------------------------

    const codeExists = await selectWithJoins(
      "createpricing",
      [],
      {
        code: code.trim(),
        companyId,
        delete: 0,
      },
      ["createPricingId"],
    );

    if (codeExists.length > 0) {
      return errorResponse(
        res,
        "Pricing code already exists. Please enter a different code.",
      );
    }

    // --------------------------------------------------------
    // CREATE PAYLOAD
    // --------------------------------------------------------

    const payload = {
      companyId,
      code: code.trim(),
      description: description.trim(),
      effectiveDate,
      exShowroomPrice,
      status: "active",
      delete: 0,
    };

    const createPricing = await saveModel("createpricing", payload);

    return successResponse(res, createPricing, "Pricing created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(
        res,
        "Pricing code already exists. Please enter a different code.",
      );
    }

    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// LIST PRICING
// ============================================================

const getCreatePricingList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "createpricing",
      [],
      {
        companyId,
        delete: 0,
      },
      [
        "createPricingId",
        "companyId",
        "code",
        "description",
        "effectiveDate",
        "exShowroomPrice",
        "status",
        "created",
      ],
      [["createPricingId", "DESC"]],
    );

    return successResponse(res, list, "Pricing list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// GET PRICING BY ID
// ============================================================

const getCreatePricingById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "createpricing",
      [],
      {
        createPricingId: id,
        companyId,
        delete: 0,
      },
      [
        "createPricingId",
        "companyId",
        "code",
        "description",
        "effectiveDate",
        "exShowroomPrice",
        "status",
        "created",
      ],
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Pricing not found");
    }

    return successResponse(res, rows[0], "Pricing fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// UPDATE PRICING
// ============================================================

const updateCreatePricing = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      createPricingId,
      code,
      description,
      effectiveDate,
      exShowroomPrice,
      status,
    } = req.body;

    // --------------------------------------------------------
    // CHECK EXISTING
    // --------------------------------------------------------

    const existing = await selectWithJoins(
      "createpricing",
      [],
      {
        createPricingId,
        companyId,
        delete: 0,
      },
      ["createPricingId"],
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Pricing not found");
    }

    // --------------------------------------------------------
    // CHECK DUPLICATE CODE
    // --------------------------------------------------------

    const codeExists = await selectWithJoins(
      "createpricing",
      [],
      {
        code: code.trim(),
        companyId,
        delete: 0,
      },
      ["createPricingId"],
    );

    const codeTakenByOther = codeExists.some(
      (row) => String(row.createPricingId) !== String(createPricingId),
    );

    if (codeTakenByOther) {
      return errorResponse(
        res,
        "Pricing code already exists. Please enter a different code.",
      );
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    await updateModelHelper(
      "createpricing",
      {
        code: code.trim(),
        description: description.trim(),
        effectiveDate,
        exShowroomPrice,
        status,
        updated: new Date(),
      },
      {
        createPricingId,
        companyId,
      },
    );

    return successResponse(res, {}, "Pricing updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(
        res,
        "Pricing code already exists. Please enter a different code.",
      );
    }

    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// DELETE PRICING - SOFT DELETE
// ============================================================

const deleteCreatePricing = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { createPricingId } = req.body;

    const existing = await selectWithJoins(
      "createpricing",
      [],
      {
        createPricingId,
        companyId,
        delete: 0,
      },
      ["createPricingId"],
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Pricing not found");
    }

    await updateModelHelper(
      "createpricing",
      {
        delete: 1,
        updated: new Date(),
      },
      {
        createPricingId,
        companyId,
      },
    );

    return successResponse(res, {}, "Pricing deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// CHECK PRICING CODE
// ============================================================

const checkCreatePricingCode = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { code } = req.query;

    if (!code || !String(code).trim()) {
      return successResponse(res, { exists: false }, "Code is required");
    }

    const rows = await selectWithJoins(
      "createmaster",
      [],
      {
        code: String(code).trim(),
        companyId,
        delete: 0,
      },
      ["createMasterId", "code", "description"],
    );

    if (rows.length === 0) {
      return successResponse(
        res,
        {
          exists: false,
          code: String(code).trim(),
        },
        "Code does not exist in Create Master",
      );
    }

    return successResponse(
      res,
      {
        exists: true,
        createMasterId: rows[0].createMasterId,
        code: rows[0].code,
        description: rows[0].description,
      },
      "Code matched successfully",
    );
  } catch (error) {
    console.error("Check Create Pricing code error:", error);

    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ============================================================
// BULK IMPORT PRICING FROM EXCEL
// ============================================================

const bulkImportCreatePricing = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "No pricing data found to import.");
    }

    // ========================================================
    // GET ALL EXISTING PRICING
    // INCLUDING SOFT-DELETED RECORDS
    // ========================================================

    const existingPricing = await selectWithJoins(
      "createpricing",
      [],
      {
        companyId,
      },
      [
        "createPricingId",
        "code",
        "description",
        "effectiveDate",
        "exShowroomPrice",
        "status",
        "delete",
      ],
    );

    // ========================================================
    // MAP EXISTING RECORDS BY CODE
    // ========================================================

    const existingPricingByCode = new Map();

    existingPricing.forEach((item) => {
      const codeKey = String(item.code || "")
        .trim()
        .toLowerCase();

      if (codeKey) {
        existingPricingByCode.set(codeKey, item);
      }
    });

    // ========================================================
    // PASS 1 - VALIDATE EXCEL
    // ========================================================

    const errors = [];
    const seenCodes = new Set();
    const normalizedRows = [];

    items.forEach((row, i) => {
      const rowNum = i + 2;

      const code = String(row.code || "").trim();
      const description = String(row.description || "").trim();

      const effectiveDate =
        row.effectiveDate === undefined ||
        row.effectiveDate === null ||
        String(row.effectiveDate).trim() === ""
          ? null
          : row.effectiveDate;
      const exShowroomPrice =
        row.exShowroomPrice === undefined ||
        row.exShowroomPrice === null ||
        String(row.exShowroomPrice).trim() === ""
          ? null
          : Number(row.exShowroomPrice);

      // ======================================================
      // CODE REQUIRED
      // ======================================================

      if (!code) {
        errors.push({
          row: rowNum,
          code,
          reason: "Code is required",
        });
        return;
      }

      // ======================================================
      // DESCRIPTION REQUIRED
      // ======================================================

      if (!description) {
        errors.push({
          row: rowNum,
          code,
          reason: "Description is required",
        });
        return;
      }

      // ======================================================
      // DUPLICATE INSIDE EXCEL
      // ======================================================

      const codeKey = code.toLowerCase();

      if (seenCodes.has(codeKey)) {
        errors.push({
          row: rowNum,
          code,
          reason: "Duplicate pricing code within the imported file",
        });
        return;
      }

      // ======================================================
      // PRICE VALIDATION
      // ======================================================

      if (
        exShowroomPrice !== null &&
        (Number.isNaN(exShowroomPrice) || exShowroomPrice < 0)
      ) {
        errors.push({
          row: rowNum,
          code,
          reason: "Ex-Showroom price must be a valid non-negative number",
        });
        return;
      }

      seenCodes.add(codeKey);

      normalizedRows.push({
        rowNum,
        code,
        description,
        effectiveDate,
        exShowroomPrice,
      });
    });

    // ========================================================
    // REJECT ONLY IF EXCEL ITSELF HAS INVALID DATA
    // ========================================================

    if (errors.length > 0) {
      return errorResponse(
        res,
        `Import rejected: ${errors.length} row(s) have errors.`,
        errors,
      );
    }

    // ========================================================
    // PASS 2 - CREATE OR UPDATE
    // ========================================================

    const created = [];
    const updated = [];

    for (const row of normalizedRows) {
      const codeKey = row.code.toLowerCase();

      const existingPricing = existingPricingByCode.get(codeKey);

      // ======================================================
      // CASE 1: CODE EXISTS
      // UPDATE EXISTING RECORD
      // ======================================================

      if (existingPricing) {
        await updateModelHelper(
          "createpricing",
          {
            // Keep the existing unique code
            code: existingPricing.code,

            // Replace Excel values
            description: row.description,
            effectiveDate: row.effectiveDate,
            exShowroomPrice: row.exShowroomPrice,

            status: "active",
            delete: 0,
            updated: new Date(),
          },
          {
            createPricingId: existingPricing.createPricingId,
            companyId,
          },
        );

        updated.push({
          row: row.rowNum,
          createPricingId: existingPricing.createPricingId,
          code: existingPricing.code,
        });

        continue;
      }

      // ======================================================
      // CASE 2: CODE DOES NOT EXIST
      // CREATE NEW RECORD
      // ======================================================

      const savedPricing = await saveModel("createpricing", {
        companyId,
        code: row.code,
        description: row.description,
        effectiveDate: row.effectiveDate,
        exShowroomPrice: row.exShowroomPrice,
        status: "active",
        delete: 0,
      });

      created.push({
        row: row.rowNum,
        createPricingId: savedPricing.createPricingId,
        code: row.code,
      });
    }

    // ========================================================
    // FINAL RESPONSE
    // ========================================================

    return successResponse(
      res,
      {
        created,
        updated,
        totalCreated: created.length,
        totalUpdated: updated.length,
      },
      `${created.length} pricing record(s) created and ${updated.length} pricing record(s) updated successfully.`,
    );
  } catch (error) {
    console.error("Bulk Pricing Import Error:", error);

    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(
        res,
        "Pricing code already exists. Please check duplicate codes.",
      );
    }

    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getCreateMasterForPricingExport = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const createMaster = await selectWithJoins(
      "createmaster",
      [],
      {
        companyId,
        delete: 0,
      },
      ["code", "description"],
    );

    return successResponse(
      res,
      createMaster,
      "Create Master data fetched successfully.",
    );
  } catch (error) {
    console.error("Create Master pricing export error:", error);

    return errorResponse(res, "Something went wrong", error);
  }
};

module.exports = {
  createCreatePricing,
  getCreatePricingList,
  getCreatePricingById,
  updateCreatePricing,
  deleteCreatePricing,
  checkCreatePricingCode,
  bulkImportCreatePricing,
  getCreateMasterForPricingExport,
};
