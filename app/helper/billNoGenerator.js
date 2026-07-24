const { selectWithJoins } = require("./index.js");
const { getFinancialYearById } = require("./financialYear.js");

const generateVoucherNo = async ({
  companyId,
  financialYearId,
  tableName,
  idColumn = "id",
  fixedPrefix,
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

  const prefix = fixedPrefix || "P";

  const whereClause = {
    companyId,
    delete: 0,
    financialYearId: fy.financialYearId,
    ...extraWhere,
  };

  // 👇 ab dono cheezein dynamic — tableName aur idColumn, "purchase"/"purchaseId" hardcoded nahi
  const existingRows = await selectWithJoins(tableName, [], whereClause, [idColumn]);
  const nextSeq = existingRows.length + 1;
  const seqPadded = String(nextSeq).padStart(padLength, "0");

  const parts = [prefix];
  if (tag) parts.push(tag);
  parts.push(fy.fyLabel);
  parts.push(seqPadded);

  const voucherNo = parts.join("/");

  return {
    voucherNo,
    billNo: voucherNo, // purchase controller isi shape ko use karta he, backward-compatible
    financialYearId: fy.financialYearId,
    fyLabel: fy.fyLabel,
  };
};

module.exports = { generateVoucherNo };