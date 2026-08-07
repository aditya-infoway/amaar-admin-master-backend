const { selectWithJoins } = require("./index.js");
const { getFinancialYearById } = require("./financialYear.js");

// 👇 companyprefix table se company ka prefix nikalta he.
// Agar company ne is prefixFor ke liye prefix save nahi kiya,
// to blank ("") return hoga — koi fixed/fallback prefix nahi.
const getCompanyPrefix = async (companyId, prefixFor) => {
  if (!prefixFor) return "";

  const rows = await selectWithJoins(
    "companyprefix",
    [],
    { companyId, prefixFor, delete: 0 },
    ["prefix"]
  );

  return rows.length > 0 && rows[0].prefix ? rows[0].prefix : "";
};

const generateVoucherNo = async ({
  companyId,
  financialYearId,
  tableName,
  idColumn = "id",
  prefixFor,   // 👈 companyprefix.prefixFor se match hoga, e.g. "LEAD", "PURCHASE"
  tag = "",
  extraWhere = {},
  padLength = 3,
}) => {
  if (!financialYearId) {
    throw new Error("Financial Year not found in session.");
  }

  const fy = await getFinancialYearById(financialYearId, companyId);
  if (!fy) {
    throw new Error("Invalid or inactive Financial Year for this company.");
  }

  // 👇 sirf database wala prefix — kuch save nahi to blank
  const prefix = await getCompanyPrefix(companyId, prefixFor);

  const whereClause = {
    companyId,
    delete: 0,
    financialYearId: fy.financialYearId,
    ...extraWhere,
  };

  const existingRows = await selectWithJoins(tableName, [], whereClause, [idColumn]);
  const nextSeq = existingRows.length + 1;
  const seqPadded = String(nextSeq).padStart(padLength, "0");

  // 👇 blank prefix ya blank tag ki wajah se voucherNo me khaali "//" na aaye,
  // isliye empty parts ko filter kar diya
  const parts = [prefix, tag, fy.fyLabel, seqPadded].filter((p) => p !== "" && p != null);

  const voucherNo = parts.join("/");

  return {
    voucherNo,
    billNo: voucherNo, // purchase controller isi shape ko use karta he, backward-compatible
    prefixUsed: prefix, // blank ho sakta he agar company ne prefix save nahi kiya
    financialYearId: fy.financialYearId,
    fyLabel: fy.fyLabel,
  };
};

module.exports = { generateVoucherNo };