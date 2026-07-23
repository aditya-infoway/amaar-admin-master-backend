// controllers/superadmin/controller/paymentcontroller.js
const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  selectWithJoins,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");
const { updateAccountBalance } = require("../../../helper/accountBalance.js");

const VOUCHER_CONFIG = {
  "CASH PAYMENT": { prefix: "CP" },
  "BANK PAYMENT": { prefix: "BP" },
  "CASH RECEIPT": { prefix: "CR" },
  "BANK RECEIPT": { prefix: "BR" },
  "CONTRA": { prefix: "CN" },
  "JOURNAL": { prefix: "JV" },
};

// ---------------- GET NEXT VOUCHER NO (generic — sab voucher types ke liye) ----------------
const getNextVoucherNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId, voucherType } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId) return errorResponse(res, "Financial Year not found in session.");
    if (!voucherType || !VOUCHER_CONFIG[voucherType]) {
      return errorResponse(res, "Invalid or missing voucher type.");
    }

    const { prefix } = VOUCHER_CONFIG[voucherType];

    const { voucherNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "payment",
      idColumn: "id",
      fixedPrefix: prefix,
      extraWhere: { voucherType },
    });

    return successResponse(res, { voucherNo, fyLabel, financialYearId }, "Voucher number generated successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE CASH PAYMENT (Manual mode only) ----------------
const createCashPayment = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { cashAccountId, voucherNo, date, oppAccountId, amount, narration, financialYearId } = req.body;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- Voucher No duplicate protection ----
    const dupCheck = await selectWithJoins(
      "payment", [],
      { companyId, financialYearId: fy.financialYearId, voucherType: "CASH PAYMENT", voucherNo, delete: 0 },
      ["id"]
    );
    if (dupCheck.length > 0) {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }

    // ---- Cash account validate ----
    const cashRows = await selectWithJoins("account", [], { id: cashAccountId, companyId, delete: 0 }, ["id"]);
    if (cashRows.length === 0) return errorResponse(res, "Selected cash account is invalid.");

    // ---- Opp account validate ----
    const oppRows = await selectWithJoins("account", [], { id: oppAccountId, companyId, delete: 0 }, ["id"]);
    if (oppRows.length === 0) return errorResponse(res, "Selected opp. account is invalid.");

    // ---- Cash Payment logic: Cash Account CR (paisa bahar gaya), Opp Account DR (party ka payment adjust) ----
    const payment = await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "CASH PAYMENT",
      voucherNo,
      date,
      selfAccountId: cashAccountId,
      selfDrOrCr: "CR",
      accountId: oppAccountId,
      accountDrOrCr: "DR",
      amount: Number(amount),
      narration: narration || "",
      paymentMode: "CASH",
      status: "active",
      delete: 0,
    });

    // ---- Balance update — dono accounts ----
    await updateAccountBalance(cashAccountId, amount, "CR", companyId);
    await updateAccountBalance(oppAccountId, amount, "DR", companyId);

    return successResponse(res, { id: payment.paymentId, voucherNo }, "Cash payment saved successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (Cash Payment only) ----------------
const getCashPaymentList = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const where = { companyId, voucherType: "CASH PAYMENT", delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const rows = await selectWithJoins(
      "payment", [], where,
      ["paymentId", "voucherNo", "date", "selfAccountId", "accountId", "amount", "narration"]
    );

    if (!rows.length) return successResponse(res, [], "Cash payment list fetched successfully");

    const accountIds = [...new Set([
      ...rows.map(r => r.selfAccountId),
      ...rows.map(r => r.accountId),
    ])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.accountName; });

    const data = rows.map(r => ({
      id: String(r.paymentId),
      voucherNo: r.voucherNo,
      date: r.date,
      cashAccount: accMap[r.selfAccountId] || "",
      oppAccount: accMap[r.accountId] || "",
      amount: String(r.amount),
      narration: r.narration || "",
    }));

    return successResponse(res, data, "Cash payment list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = { getNextVoucherNo, createCashPayment, getCashPaymentList };