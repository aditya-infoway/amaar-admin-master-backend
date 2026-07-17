const { selectWithJoins } = require("./index.js");
const moment = require("moment");

/**
 * Session/middleware se aaya hua financialYearId valid hai ya nahi
 * (companyId ka hi hai ya nahi) — validate karke poori row return karta hai.
 */
const getFinancialYearById = async (financialYearId, companyId) => {
  if (!financialYearId) return null;

  const rows = await selectWithJoins(
    "financialyear",
    [],
    { financialYearId, companyId, delete: 0 },
    ["financialYearId", "startDate", "endDate"]
  );

  if (!rows.length) return null;

  const fy = rows[0];
  return {
    financialYearId: fy.financialYearId,
    fyLabel: `${moment(fy.startDate).format("YY")}-${moment(fy.endDate).format("YY")}`,
    startDate: fy.startDate,
    endDate: fy.endDate,
  };
};

module.exports = { getFinancialYearById };