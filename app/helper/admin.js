const db = require("../modelses/index.js");

const checktoken = async (token) => {
  const admin = await db.admin.findAll({
    where: { token: token },
    attributes: ["adminId"],
    raw: true,
  });
  return admin;
};

module.exports = { checktoken };