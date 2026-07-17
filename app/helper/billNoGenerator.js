const { selectWithJoins } = require("./index.js");
const { getFinancialYearById } = require("./financialYear.js");

const generateVoucherNo = async ({
  companyId,
  financialYearId,
  tableName,
  prefixColumn,
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

//   const companyRow = await selectWithJoins("companydetails", [], { companyId: companyId }, [prefixColumn]);
//   const prefix = companyRow[0]?.[prefixColumn] || "";
  const prefix = "P";

  const whereClause = {
    companyId,
    delete: 0,
    financialYearId: fy.financialYearId,
    ...extraWhere,
  };

  const existingRows = await selectWithJoins("purchase", [], whereClause, ["purchaseId"]);
  const nextSeq = existingRows.length + 1;
  const seqPadded = String(nextSeq).padStart(padLength, "0");

  const parts = [prefix];
  if (tag) parts.push(tag);
  parts.push(fy.fyLabel);
  parts.push(seqPadded);

  return {
    billNo: parts.join("/"),
    financialYearId: fy.financialYearId,
    fyLabel: fy.fyLabel,
  };
};

module.exports = { generateVoucherNo };