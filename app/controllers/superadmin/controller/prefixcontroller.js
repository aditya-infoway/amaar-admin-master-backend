const {
  errorResponse,
  successResponse,
  requiredmessage,
  saveModel,
  updateModel,
  selectWithJoins,
} = require("../../../helper/index.js");

// companydetailscontroller.js me pehle se hi ye helper hai — usko wahan se
// export kar ke yahan reuse kar lena best hoga (duplicate na rakhna).
// Abhi ke liye standalone rakha hai taaki ye file independently chal jaye.
const getCompanyIdFromToken = async (req) => {
  const token = req.headers["x-token"] || req.headers["X-Token"] || "";
  if (!token) return null;

  const companyRows = await selectWithJoins(
    "company",
    [],
    { token, delete: 0 },
    ["companyId"]
  );

  if (companyRows.length === 0) return null;
  return companyRows[0].companyId;
};

// ---- CREATE ----
const createPrefix = async (req, res) => {
  try {
    const companyId = await getCompanyIdFromToken(req);
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { prefixFor, prefix } = req.body;

    // Same company + same prefixFor already exists to nayi row nahi, error do
    const existing = await selectWithJoins(
      "companyprefix",
      [],
      { companyId, prefixFor, delete: 0 },
      ["prefixId"]
    );

    if (existing.length > 0) {
      return errorResponse(res, `Prefix for "${prefixFor}" already exists. Please edit it instead.`);
    }

    const payload = {
      companyId,
      prefixFor,
      prefix,
      delete: 0,
    };

    const data = await saveModel("companyprefix", payload);

    if (!data?.prefixId) {
      return errorResponse(res, "Failed to save prefix");
    }

    return successResponse(res, data, "Prefix added successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---- UPDATE ----
const updatePrefix = async (req, res) => {
  try {
    const companyId = await getCompanyIdFromToken(req);
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { prefixId, prefixFor, prefix } = req.body;

    const existing = await selectWithJoins(
      "companyprefix",
      [],
      { prefixId, companyId, delete: 0 },
      ["prefixId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Prefix not found.");
    }

    await updateModel(
      "companyprefix",
      { prefixFor, prefix, updated: new Date() },
      { prefixId, companyId }
    );

    return successResponse(res, {}, "Prefix updated successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---- LIST ----
const getPrefixList = async (req, res) => {
  try {
    const companyId = await getCompanyIdFromToken(req);
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const rows = await selectWithJoins(
      "companyprefix",
      [],
      { companyId, delete: 0 },
      ["prefixId", "prefixFor", "prefix", "created", "updated"],
      [["prefixId", "DESC"]]
    );

    return successResponse(res, rows, "Prefix list fetched successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = { createPrefix, updatePrefix, getPrefixList };