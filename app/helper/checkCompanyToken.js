const db = require("../modelses/index.js");

// today's date in India time, e.g. "2026-09-24"
const todayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const checkCompanyToken = async (token) => {
  const company = await db.company.findAll({
    where: { token: token, delete: 0 },
    attributes: ["companyId", "companyName", "status", "expiryDate", "tokenDate"],
    raw: true,
  });
  return company;
};

module.exports = { checkCompanyToken, todayIST };