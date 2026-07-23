// helper/accountBalance.js
const { account: Account } = require("../modelses");

/**
 * type: "DR" ya "CR" — jis direction se is account mein entry aa rahi he
 * Same logic jo PHP Useraccount::updateBalance() mein tha
 */
const updateAccountBalance = async (accountId, amount, type, companyId) => {
  const acc = await Account.findOne({ where: { id: accountId, companyId, delete: 0 } });
  if (!acc) throw new Error(`Account id ${accountId} not found for balance update.`);

  const current = acc.currentDrOrCr === "DR"
    ? Number(acc.currentBalance)
    : -Number(acc.currentBalance);

  const incoming = type === "DR" ? Number(amount) : -Number(amount);
  const next = current + incoming;

  if (next >= 0) {
    acc.currentDrOrCr = "DR";
    acc.currentBalance = next;
  } else {
    acc.currentDrOrCr = "CR";
    acc.currentBalance = Math.abs(next);
  }

  acc.updated = new Date();
  await acc.save();
  return acc;
};

module.exports = { updateAccountBalance };