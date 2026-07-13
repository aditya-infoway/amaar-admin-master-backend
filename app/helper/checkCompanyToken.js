const db = require("../modelses/index.js");

const checkCompanyToken = async (token) => {
  const company = await db.company.findAll({
    where: { token: token, delete: 0 },
    attributes: ["companyId", "companyName", "status", "expiryDate"],
    raw: true,
  });
  return company;
};

module.exports = { checkCompanyToken };