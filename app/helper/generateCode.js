/**
 * Reusable code generator — companyId wise alag sequence chalega.
 * companyId=1 ka CAT001...CAT015, companyId=2 ka fir se CAT001 se start.
 *
 * @param {Model}  model      - Sequelize model (Category, ProductSeries, Model, etc.)
 * @param {Number} companyId  - token se mila companyId
 * @param {String} prefix     - "CAT", "PS", "MOD" etc.
 * @param {String} pkField    - model ka primary key column (e.g. "categoryId")
 * @param {String} codeField  - code column ka naam (default "code")
 * @param {Number} padLength  - digits (default 3 => 001)
 */
const generateCode = async (
  model,
  companyId,
  prefix,
  pkField = "id",
  codeField = "code",
  padLength = 3
) => {
  const lastRow = await model.findOne({
    where: { companyId },
    order: [[pkField, "DESC"]],
  });

  let nextNumber = 1;

  if (lastRow && lastRow[codeField]) {
    const numericPart = parseInt(lastRow[codeField].replace(prefix, ""), 10);
    if (!isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(padLength, "0")}`;
};

module.exports = generateCode;