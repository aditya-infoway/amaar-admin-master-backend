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
const { resolveCreatedByNames, getCreatedByName } = require("../../../helper/resolveCreatedBy.js");

const VOUCHER_CONFIG = {
  "CASH PAYMENT": { prefix: "CASH PAYMENT" },
  "BANK PAYMENT": { prefix: "BANK PAYMENT" },
  "CASH RECEIPT": { prefix: "CASH RECEIPT" },
  "BANK RECEIPT": { prefix: "BANK RECEIPT" },
  "CONTRA": { prefix: "CONTRA" },
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
      idColumn: "paymentId",
      prefixFor: prefix,
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
    const {
      cashAccountId, voucherNo, date, oppAccountId, amount, narration, financialYearId,
      createdBy, createdType,
    } = req.body;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- Voucher No duplicate protection ----
    const dupCheck = await selectWithJoins(
      "payment", [],
      { companyId, financialYearId: fy.financialYearId, voucherType: "CASH PAYMENT", voucherNo, delete: 0 },
      ["paymentId"]
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

    // ---- Cash Payment logic: Cash Account CR (paisa bahar gaya), Opp Account DR ----
    const payment = await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "CASH PAYMENT",
      paymentCollectedByModules: "CP",
      voucherNo,
      date,
      selfAccountId: cashAccountId,
      selfDrOrCr: "CR",
      accountId: oppAccountId,
      accountDrOrCr: "DR",
      amount: Number(amount),
      narration: narration || "",
      paymentMode: "CASH",
      // dynamic — API se aaya to wo, warna companyId + "Super Admin" fallback
      createdBy: createdBy != null ? Number(createdBy) : companyId,
      createdType: createdType || "Super Admin",
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

// ---------------- CREATE BANK PAYMENT (Manual mode only) ----------------
const createBankPayment = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      bankAccountId, voucherNo, date, oppAccountId, amount, transactionMode,
      chequeNo, chequeDate, chequeClearDate, narration, financialYearId,
      createdBy, createdType,
    } = req.body;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- Voucher No duplicate protection ----
    const dupCheck = await selectWithJoins(
      "payment", [],
      { companyId, financialYearId: fy.financialYearId, voucherType: "BANK PAYMENT", voucherNo, delete: 0 },
      ["paymentId"]
    );
    if (dupCheck.length > 0) {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }

    // ---- Bank account validate ----
    const bankRows = await selectWithJoins("account", [], { id: bankAccountId, companyId, delete: 0 }, ["id"]);
    if (bankRows.length === 0) return errorResponse(res, "Selected bank account is invalid.");

    // ---- Opp account validate ----
    const oppRows = await selectWithJoins("account", [], { id: oppAccountId, companyId, delete: 0 }, ["id"]);
    if (oppRows.length === 0) return errorResponse(res, "Selected opp. account is invalid.");

    // ---- Cheque mode ho to cheque fields double-check server side ----
    const modeUpper = String(transactionMode || "").toUpperCase();
    if (modeUpper === "CHEQUE" && (!chequeNo || !chequeDate)) {
      return errorResponse(res, "Cheque number and cheque date are required for cheque mode.");
    }

    // ---- Bank Payment logic: Bank Account CR (paisa bahar gaya), Opp Account DR ----
    const payment = await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "BANK PAYMENT",
      voucherNo,
      paymentCollectedByModules: "BP",
      date,
      selfAccountId: bankAccountId,
      selfDrOrCr: "CR",
      accountId: oppAccountId,
      accountDrOrCr: "DR",
      amount: Number(amount),
      narration: narration || "",
      paymentMode: modeUpper,
      chequeNo: modeUpper === "CHEQUE" ? chequeNo : null,
      chequeDate: modeUpper === "CHEQUE" ? chequeDate : null,
      chequeClearDate: modeUpper === "CHEQUE" ? (chequeClearDate || null) : null,
      // dynamic
      createdBy: createdBy != null ? Number(createdBy) : companyId,
      createdType: createdType || "Super Admin",
      status: "active",
      delete: 0,
    });

    // ---- Balance update — dono accounts ----
    await updateAccountBalance(bankAccountId, amount, "CR", companyId);
    await updateAccountBalance(oppAccountId, amount, "DR", companyId);

    return successResponse(res, { id: payment.paymentId, voucherNo }, "Bank payment saved successfully");
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
      [
        "paymentId", "voucherNo", "date", "selfAccountId", "accountId",
        "amount", "narration", "createdBy", "createdType",
      ]
    );

    if (!rows.length) return successResponse(res, [], "Cash payment list fetched successfully");

    // ---- Opp/Cash account naam ----
    const accountIds = [...new Set([...rows.map(r => r.selfAccountId), ...rows.map(r => r.accountId)])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.accountName; });

    // ---- Created By naam (Super Admin -> companydetails, Employee/designation -> employee) ----
    const createdByMap = await resolveCreatedByNames(rows);

    const data = rows.map(r => ({
      id: String(r.paymentId),
      voucherNo: r.voucherNo,
      date: r.date,
      cashAccount: accMap[r.selfAccountId] || "",
      oppAccount: accMap[r.accountId] || "",
      amount: String(r.amount),
      narration: r.narration || "",
      createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
      createdType: r.createdType || "",
    }));

    return successResponse(res, data, "Cash payment list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (Bank Payment only) ----------------
const getBankPaymentList = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const where = { companyId, voucherType: "BANK PAYMENT", delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const rows = await selectWithJoins(
      "payment", [], where,
      [
        "paymentId", "voucherNo", "date", "selfAccountId", "accountId",
        "amount", "paymentMode", "narration", "createdBy", "createdType",
      ]
    );

    if (!rows.length) return successResponse(res, [], "Bank payment list fetched successfully");

    const accountIds = [...new Set([...rows.map(r => r.selfAccountId), ...rows.map(r => r.accountId)])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.accountName; });

    const createdByMap = await resolveCreatedByNames(rows);

    const data = rows.map(r => ({
      id: String(r.paymentId),
      voucherNo: r.voucherNo,
      date: r.date,
      bankAccount: accMap[r.selfAccountId] || "",
      oppAccount: accMap[r.accountId] || "",
      amount: String(r.amount),
      transactionMode: (r.paymentMode || "").toLowerCase(),
      narration: r.narration || "",
      createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
      createdType: r.createdType || "",
    }));

    return successResponse(res, data, "Bank payment list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// const getCashBook = async (req, res) => {
//   try {
//     const companyId = req.companyId;
//     const {
//       financialYearId,
//       search = "",
//       transactionType = "ALL", // "ALL" or any value present in paymentCollectedByModules (CP, CR, LCR, JCR, ...)
//       fromDate,                // "YYYY-MM-DD"
//       toDate,                  // "YYYY-MM-DD"
//     } = req.query;
 
//     if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
 
//     const where = {
//       companyId,
//       voucherType: "CASH PAYMENT",
//       delete: 0,
//     };
//     if (financialYearId) where.financialYearId = financialYearId;
 
//     let rows = await selectWithJoins(
//       "payment", [], where,
//       [
//         "paymentId", "voucherNo", "date", "voucherType", "paymentCollectedByModules",
//         "selfAccountId", "accountId", "selfDrOrCr", "amount", "narration",
//         "createdBy", "createdType",
//       ]
//     );
 
//     // ---- Date range filter ----
//     // NOTE: if selectWithJoins supports range where-clauses in your helper,
//     // move this into `where` above instead of filtering in memory.
//     if (fromDate) rows = rows.filter((r) => String(r.date) >= fromDate);
//     if (toDate) rows = rows.filter((r) => String(r.date) <= toDate);
 
//     // ---- Transaction type filter (matches the stored module code directly) ----
//     if (transactionType && transactionType !== "ALL") {
//       rows = rows.filter((r) => (r.paymentCollectedByModules || "") === transactionType);
//     }
 
//     if (!rows.length) {
//       return successResponse(
//         res,
//         { list: [], totalReceipts: "0.00", totalPayments: "0.00", closingBalance: "0.00", totalTransactions: 0 },
//         "Cash book fetched successfully"
//       );
//     }
 
//     // ---- Account names (self side + opp/party side) ----
//     const accountIds = [...new Set([...rows.map((r) => r.selfAccountId), ...rows.map((r) => r.accountId)])];
//     const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
//     const accMap = {};
//     accounts.forEach((a) => { accMap[a.id] = a.accountName; });
 
//     // ---- Created By naam ----
//     const createdByMap = await resolveCreatedByNames(rows);
 
//     // ---- Build rows + running totals ----
//     // selfDrOrCr on the cash account tells us direction:
//     //   "DR" -> cash came IN  (receipt)
//     //   "CR" -> cash went OUT (payment)
//     let totalReceipts = 0;
//     let totalPayments = 0;
 
//     let list = rows
//       .sort((a, b) => (new Date(b.date) - new Date(a.date)) || (b.paymentId - a.paymentId))
//       .map((r) => {
//         const isReceipt = r.selfDrOrCr === "DR";
//         const receiptAmt = isReceipt ? Number(r.amount) : 0;
//         const paymentAmt = !isReceipt ? Number(r.amount) : 0;
//         totalReceipts += receiptAmt;
//         totalPayments += paymentAmt;
 
//         return {
//           id: String(r.paymentId),
//           voucherNo: r.voucherNo,
//           date: r.date,
//           type: r.paymentCollectedByModules || "",
//           accountName: accMap[r.selfAccountId] || "",
//           partyName: accMap[r.accountId] || "",
//           receipt: receiptAmt ? receiptAmt.toFixed(2) : "",
//           payment: paymentAmt ? paymentAmt.toFixed(2) : "",
//           narration: r.narration || "",
//           createdType: r.createdType || "",
//           createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
//         };
//       });
 
//     // ---- Free-text search (voucher no / account / party / narration) ----
//     if (search) {
//       const s = String(search).toLowerCase();
//       list = list.filter(
//         (r) =>
//           r.voucherNo.toLowerCase().includes(s) ||
//           r.partyName.toLowerCase().includes(s) ||
//           r.accountName.toLowerCase().includes(s) ||
//           r.narration.toLowerCase().includes(s)
//       );
//     }
 
//     list = list.map((r, idx) => ({ sr: idx + 1, ...r }));
 
//     const closingBalance = totalReceipts - totalPayments;
 
//     return successResponse(
//       res,
//       {
//         list,
//         totalReceipts: totalReceipts.toFixed(2),
//         totalPayments: totalPayments.toFixed(2),
//         closingBalance: closingBalance.toFixed(2),
//         totalTransactions: list.length,
//       },
//       "Cash book fetched successfully"
//     );
//   } catch (error) {
//     return errorResponse(res, error.message || "Something Went Wrong", error);
//   }
// };

// paymentcontroller.js — is function ko module.exports se pehle add karo

const getCashBook = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      financialYearId,
      search = "",
      transactionType = "ALL",
      fromDate,
      toDate,
    } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const paymentFields = [
      "paymentId", "voucherNo", "date", "voucherType", "paymentCollectedByModules",
      "selfAccountId", "accountId", "selfDrOrCr", "accountDrOrCr", "amount", "narration",
      "createdBy", "createdType",
    ];

    // ---- Cash Payment/Receipt rows (self side hamesha cash) ----
    const cpWhere = { companyId, delete: 0, voucherType: "CASH PAYMENT" };
    if (financialYearId) cpWhere.financialYearId = financialYearId;
    const cpRows = await selectWithJoins("payment", [], cpWhere, paymentFields);

    // ---- Cash Receipt bhi include karo (agar list me pehle sirf CASH PAYMENT tha) ----
    const crWhere = { companyId, delete: 0, voucherType: "CASH RECEIPT" };
    if (financialYearId) crWhere.financialYearId = financialYearId;
    const crRows = await selectWithJoins("payment", [], crWhere, paymentFields);

    // ---- Contra rows jisme Cash involve ho (CTD ya CTW), CTT skip karo (usme cash hota hi nahi) ----
    const contraWhere = { companyId, delete: 0, voucherType: "CONTRA" };
    if (financialYearId) contraWhere.financialYearId = financialYearId;
    const contraRowsRaw = await selectWithJoins("payment", [], contraWhere, paymentFields);

    // ✅ NEW — Contra rows normalize karo: jo bhi side Cash hai, usse "self" bana do
    const normalizedContraRows = contraRowsRaw
      .filter((r) => r.paymentCollectedByModules === "CTD" || r.paymentCollectedByModules === "CTW")
      .map((r) => {
        if (r.paymentCollectedByModules === "CTD") {
          // Cash Deposit: self side (selfAccountId) already Cash hai
          return {
            paymentId: r.paymentId,
            voucherNo: r.voucherNo,
            date: r.date,
            voucherType: r.voucherType,
            paymentCollectedByModules: r.paymentCollectedByModules,
            selfAccountId: r.selfAccountId,   // Cash
            accountId: r.accountId,           // Bank (party)
            selfDrOrCr: r.selfDrOrCr,          // "CR" — cash bahar gaya
            amount: r.amount,
            narration: r.narration,
            createdBy: r.createdBy,
            createdType: r.createdType,
          };
        }
        // Cash Withdrawal: opp side (accountId) Cash hai — usse self bana do
        return {
          paymentId: r.paymentId,
          voucherNo: r.voucherNo,
          date: r.date,
          voucherType: r.voucherType,
          paymentCollectedByModules: r.paymentCollectedByModules,
          selfAccountId: r.accountId,        // Cash (normalized)
          accountId: r.selfAccountId,        // Bank (party, normalized)
          selfDrOrCr: r.accountDrOrCr,       // "DR" — cash andar aaya
          amount: r.amount,
          narration: r.narration,
          createdBy: r.createdBy,
          createdType: r.createdType,
        };
      });

    let rows = [...cpRows, ...crRows, ...normalizedContraRows];

    if (fromDate) rows = rows.filter((r) => String(r.date) >= fromDate);
    if (toDate) rows = rows.filter((r) => String(r.date) <= toDate);

    if (transactionType && transactionType !== "ALL") {
      rows = rows.filter((r) => (r.paymentCollectedByModules || "") === transactionType);
    }

    if (!rows.length) {
      return successResponse(
        res,
        { list: [], totalReceipts: "0.00", totalPayments: "0.00", closingBalance: "0.00", totalTransactions: 0 },
        "Cash book fetched successfully"
      );
    }

    const accountIds = [...new Set([...rows.map((r) => r.selfAccountId), ...rows.map((r) => r.accountId)])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach((a) => { accMap[a.id] = a.accountName; });

    const createdByMap = await resolveCreatedByNames(rows);

    let totalReceipts = 0;
    let totalPayments = 0;

    let list = rows
      .sort((a, b) => (new Date(b.date) - new Date(a.date)) || (String(b.paymentId).localeCompare(String(a.paymentId))))
      .map((r) => {
        const isReceipt = r.selfDrOrCr === "DR";
        const receiptAmt = isReceipt ? Number(r.amount) : 0;
        const paymentAmt = !isReceipt ? Number(r.amount) : 0;
        totalReceipts += receiptAmt;
        totalPayments += paymentAmt;

        return {
          id: String(r.paymentId),
          voucherNo: r.voucherNo,
          date: r.date,
          type: r.paymentCollectedByModules || "",
          accountName: accMap[r.selfAccountId] || "",
          partyName: accMap[r.accountId] || "",
          receipt: receiptAmt ? receiptAmt.toFixed(2) : "",
          payment: paymentAmt ? paymentAmt.toFixed(2) : "",
          narration: r.narration || "",
          createdType: r.createdType || "",
          createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
        };
      });

    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(
        (r) =>
          r.voucherNo.toLowerCase().includes(s) ||
          r.partyName.toLowerCase().includes(s) ||
          r.accountName.toLowerCase().includes(s) ||
          r.narration.toLowerCase().includes(s)
      );
    }

    list = list.map((r, idx) => ({ sr: idx + 1, ...r }));

    const closingBalance = totalReceipts - totalPayments;

    return successResponse(
      res,
      {
        list,
        totalReceipts: totalReceipts.toFixed(2),
        totalPayments: totalPayments.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
        totalTransactions: list.length,
      },
      "Cash book fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getBankBook = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      financialYearId,
      search = "",
      transactionType = "ALL",
      bankAccountId = "ALL",
      fromDate,
      toDate,
    } = req.query;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const paymentFields = [
      "paymentId", "voucherNo", "date", "voucherType", "paymentCollectedByModules",
      "selfAccountId", "accountId", "selfDrOrCr", "accountDrOrCr", "amount", "narration",
      "paymentMode", "chequeNo", "chequeDate", "chequeClearDate",
      "createdBy", "createdType",
    ];

    // ---- Bank Payment/Receipt rows ----
    const bpWhere = { companyId, delete: 0, voucherType: "BANK PAYMENT" };
    if (financialYearId) bpWhere.financialYearId = financialYearId;
    let bpRows = await selectWithJoins("payment", [], bpWhere, paymentFields);
    bpRows = bpRows.filter((r) => r.paymentMode && r.paymentMode !== "CASH");

    const brWhere = { companyId, delete: 0, voucherType: "BANK RECEIPT" };
    if (financialYearId) brWhere.financialYearId = financialYearId;
    let brRows = await selectWithJoins("payment", [], brWhere, paymentFields);
    brRows = brRows.filter((r) => r.paymentMode && r.paymentMode !== "CASH");

    // ---- Contra rows jisme Bank involve ho ----
    const contraWhere = { companyId, delete: 0, voucherType: "CONTRA" };
    if (financialYearId) contraWhere.financialYearId = financialYearId;
    const contraRowsRaw = await selectWithJoins("payment", [], contraWhere, paymentFields);

    // ✅ NEW — Contra rows normalize karo: jo bhi side Bank hai, usse "self" bana do
    const normalizedContraRows = [];
    contraRowsRaw.forEach((r) => {
      const base = {
        paymentId: r.paymentId,
        voucherNo: r.voucherNo,
        date: r.date,
        voucherType: r.voucherType,
        paymentCollectedByModules: r.paymentCollectedByModules,
        amount: r.amount,
        narration: r.narration,
        paymentMode: "CONTRA",
        chequeNo: "",
        chequeDate: "",
        chequeClearDate: "",
        createdBy: r.createdBy,
        createdType: r.createdType,
      };

      if (r.paymentCollectedByModules === "CTD") {
        // Cash Deposit: opp side (accountId) Bank hai — receiving
        normalizedContraRows.push({
          ...base,
          selfAccountId: r.accountId,     // Bank
          accountId: r.selfAccountId,     // Cash (party)
          selfDrOrCr: r.accountDrOrCr,    // "DR"
        });
      } else if (r.paymentCollectedByModules === "CTW") {
        // Cash Withdrawal: self side already Bank hai — paying out
        normalizedContraRows.push({
          ...base,
          selfAccountId: r.selfAccountId, // Bank
          accountId: r.accountId,         // Cash (party)
          selfDrOrCr: r.selfDrOrCr,       // "CR"
        });
      } else if (r.paymentCollectedByModules === "CTT") {
        // Bank Transfer: dono side Bank — 2 alag rows banao
        normalizedContraRows.push({
          ...base,
          paymentId: `${r.paymentId}-from`,
          selfAccountId: r.selfAccountId,  // From bank
          accountId: r.accountId,          // To bank (party)
          selfDrOrCr: r.selfDrOrCr,        // "CR"
        });
        normalizedContraRows.push({
          ...base,
          paymentId: `${r.paymentId}-to`,
          selfAccountId: r.accountId,      // To bank
          accountId: r.selfAccountId,      // From bank (party)
          selfDrOrCr: r.accountDrOrCr,     // "DR"
        });
      }
    });

    // ---- Poori combined list (bankAccountId filter se pehle — opening balance calc ke liye zaroori) ----
    const allRows = [...bpRows, ...brRows, ...normalizedContraRows];

    let rows = allRows;
    if (bankAccountId && bankAccountId !== "ALL") {
      rows = rows.filter((r) => Number(r.selfAccountId) === Number(bankAccountId));
    }

    if (fromDate) rows = rows.filter((r) => String(r.date) >= fromDate);
    if (toDate) rows = rows.filter((r) => String(r.date) <= toDate);

    if (transactionType && transactionType !== "ALL") {
      rows = rows.filter((r) => (r.paymentCollectedByModules || "") === transactionType);
    }

    if (!rows.length) {
      return successResponse(
        res,
        {
          list: [],
          openingBalance: bankAccountId !== "ALL" ? "0.00" : null,
          totalReceipts: "0.00",
          totalPayments: "0.00",
          closingBalance: "0.00",
          totalTransactions: 0,
          multipleBanks: bankAccountId === "ALL",
        },
        "Bank book fetched successfully"
      );
    }

    const accountIds = [...new Set([...rows.map((r) => r.selfAccountId), ...rows.map((r) => r.accountId)])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach((a) => { accMap[a.id] = a.accountName; });

    const createdByMap = await resolveCreatedByNames(rows);

    let totalReceipts = 0;
    let totalPayments = 0;

    let list = rows
      .sort((a, b) => (new Date(b.date) - new Date(a.date)) || (String(b.paymentId).localeCompare(String(a.paymentId))))
      .map((r) => {
        const isReceipt = r.selfDrOrCr === "DR";
        const receiptAmt = isReceipt ? Number(r.amount) : 0;
        const paymentAmt = !isReceipt ? Number(r.amount) : 0;
        totalReceipts += receiptAmt;
        totalPayments += paymentAmt;

        return {
          id: String(r.paymentId),
          branch: "Main Branch",
          voucherNo: r.voucherNo,
          date: r.date,
          type: r.paymentCollectedByModules || "",
          accountName: accMap[r.selfAccountId] || "",
          partyName: accMap[r.accountId] || "",
          receipt: receiptAmt ? receiptAmt.toFixed(2) : "",
          payment: paymentAmt ? paymentAmt.toFixed(2) : "",
          mode: r.paymentMode || "",
          chequeNo: r.chequeNo || "",
          chequeDate: r.chequeDate || "",
          clearDate: r.chequeClearDate || "",
          narration: r.narration || "",
          createdType: r.createdType || "",
          createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
        };
      });

    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(
        (r) =>
          r.voucherNo.toLowerCase().includes(s) ||
          r.partyName.toLowerCase().includes(s) ||
          r.accountName.toLowerCase().includes(s) ||
          r.narration.toLowerCase().includes(s)
      );
    }

    list = list.map((r, idx) => ({ sr: idx + 1, ...r }));

    const closingBalance = totalReceipts - totalPayments;

    // ---- Opening Balance: sirf ek specific bank account select hone par meaningful he ----
    let openingBalance = null;
    if (bankAccountId !== "ALL") {
      const acctRows = await selectWithJoins(
        "account", [], { id: Number(bankAccountId), companyId, delete: 0 },
        ["id", "openingBalance", "drOrCr"]
      );
      if (acctRows.length) {
        const acct = acctRows[0];
        const baseOpening = acct.drOrCr === "DR" ? Number(acct.openingBalance) : -Number(acct.openingBalance);

        let priorMovement = 0;
        if (fromDate) {
          // ✅ CHANGED — ab allRows (normalized, Contra included) se calculate karo, alag query nahi
          allRows
            .filter((r) => Number(r.selfAccountId) === Number(bankAccountId) && String(r.date) < fromDate)
            .forEach((r) => {
              priorMovement += r.selfDrOrCr === "DR" ? Number(r.amount) : -Number(r.amount);
            });
        }
        openingBalance = (baseOpening + priorMovement).toFixed(2);
      }
    }

    return successResponse(
      res,
      {
        list,
        openingBalance,
        totalReceipts: totalReceipts.toFixed(2),
        totalPayments: totalPayments.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
        totalTransactions: list.length,
        multipleBanks: bankAccountId === "ALL",
      },
      "Bank book fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};



// const getBankBook = async (req, res) => {
//   try {
//     const companyId = req.companyId;
//     const {
//       financialYearId,
//       search = "",
//       transactionType = "ALL",   // ALL | BP | BR (paymentCollectedByModules codes)
//       bankAccountId = "ALL",     // ALL ya specific account id
//       fromDate,
//       toDate,
//     } = req.query;

//     if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

//     const where = { companyId, delete: 0, voucherType : "BANK PAYMENT" };
//     if (financialYearId) where.financialYearId = financialYearId;
//     if (bankAccountId && bankAccountId !== "ALL") where.selfAccountId = Number(bankAccountId);

//     let rows = await selectWithJoins(
//       "payment", [], where,
//       [
//         "paymentId", "voucherNo", "date", "voucherType", "paymentCollectedByModules",
//         "selfAccountId", "accountId", "selfDrOrCr", "amount", "narration",
//         "paymentMode", "chequeNo", "chequeDate", "chequeClearDate",
//         "createdBy", "createdType",
//       ]
//     );

//     // ---- Bank book
//     rows = rows.filter((r) => r.paymentMode && r.paymentMode !== "CASH");

//     if (fromDate) rows = rows.filter((r) => String(r.date) >= fromDate);
//     if (toDate) rows = rows.filter((r) => String(r.date) <= toDate);

//     if (transactionType && transactionType !== "ALL") {
//       rows = rows.filter((r) => (r.paymentCollectedByModules || "") === transactionType);
//     }

//     if (!rows.length) {
//       return successResponse(
//         res,
//         {
//           list: [],
//           openingBalance: bankAccountId !== "ALL" ? "0.00" : null,
//           totalReceipts: "0.00",
//           totalPayments: "0.00",
//           closingBalance: "0.00",
//           totalTransactions: 0,
//           multipleBanks: bankAccountId === "ALL",
//         },
//         "Bank book fetched successfully"
//       );
//     }

//     const accountIds = [...new Set([...rows.map((r) => r.selfAccountId), ...rows.map((r) => r.accountId)])];
//     const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
//     const accMap = {};
//     accounts.forEach((a) => { accMap[a.id] = a.accountName; });

//     const createdByMap = await resolveCreatedByNames(rows);

//     let totalReceipts = 0;
//     let totalPayments = 0;

//     let list = rows
//       .sort((a, b) => (new Date(b.date) - new Date(a.date)) || (b.paymentId - a.paymentId))
//       .map((r) => {
//         const isReceipt = r.selfDrOrCr === "DR";
//         const receiptAmt = isReceipt ? Number(r.amount) : 0;
//         const paymentAmt = !isReceipt ? Number(r.amount) : 0;
//         totalReceipts += receiptAmt;
//         totalPayments += paymentAmt;

//         return {
//           id: String(r.paymentId),
//           // Branch abhi table exist nahi karti — jab banao, yaha se real branch lookup karke naam daal dena
//           branch: "Main Branch",
//           voucherNo: r.voucherNo,
//           date: r.date,
//           type: r.paymentCollectedByModules || "",
//           accountName: accMap[r.selfAccountId] || "",
//           partyName: accMap[r.accountId] || "",
//           receipt: receiptAmt ? receiptAmt.toFixed(2) : "",
//           payment: paymentAmt ? paymentAmt.toFixed(2) : "",
//           mode: r.paymentMode || "",
//           chequeNo: r.chequeNo || "",
//           chequeDate: r.chequeDate || "",
//           clearDate: r.chequeClearDate || "",
//           narration: r.narration || "",
//           createdType: r.createdType || "",
//           createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
//         };
//       });

//     if (search) {
//       const s = String(search).toLowerCase();
//       list = list.filter(
//         (r) =>
//           r.voucherNo.toLowerCase().includes(s) ||
//           r.partyName.toLowerCase().includes(s) ||
//           r.accountName.toLowerCase().includes(s) ||
//           r.narration.toLowerCase().includes(s)
//       );
//     }

//     list = list.map((r, idx) => ({ sr: idx + 1, ...r }));

//     const closingBalance = totalReceipts - totalPayments;

//     // ---- Opening Balance: sirf ek specific bank account select hone par meaningful he ----
//     let openingBalance = null;
//     if (bankAccountId !== "ALL") {
//       const acctRows = await selectWithJoins(
//         "account", [], { id: Number(bankAccountId), companyId, delete: 0 },
//         ["id", "openingBalance", "drOrCr"]
//       );
//       if (acctRows.length) {
//         const acct = acctRows[0];
//         const baseOpening = acct.drOrCr === "DR" ? Number(acct.openingBalance) : -Number(acct.openingBalance);

//         let priorMovement = 0;
//         if (fromDate) {
//           const priorRows = await selectWithJoins(
//             "payment", [],
//             { companyId, selfAccountId: Number(bankAccountId), delete: 0 },
//             ["date", "selfDrOrCr", "amount", "paymentMode"]
//           );
//           priorRows
//             .filter((r) => r.paymentMode && r.paymentMode !== "CASH" && String(r.date) < fromDate)
//             .forEach((r) => {
//               priorMovement += r.selfDrOrCr === "DR" ? Number(r.amount) : -Number(r.amount);
//             });
//         }
//         openingBalance = (baseOpening + priorMovement).toFixed(2);
//       }
//     }

//     return successResponse(
//       res,
//       {
//         list,
//         openingBalance,
//         totalReceipts: totalReceipts.toFixed(2),
//         totalPayments: totalPayments.toFixed(2),
//         closingBalance: closingBalance.toFixed(2),
//         totalTransactions: list.length,
//         multipleBanks: bankAccountId === "ALL",
//       },
//       "Bank book fetched successfully"
//     );
//   } catch (error) {
//     return errorResponse(res, error.message || "Something Went Wrong", error);
//   }
// };




// ---------------- CREATE CASH RECEIPT (Manual mode only) ----------------
const createCashReceipt = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      cashAccountId, voucherNo, date, oppAccountId, amount, narration, financialYearId,
      createdBy, createdType,
    } = req.body;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- Voucher No duplicate protection ----
    const dupCheck = await selectWithJoins(
      "payment", [],
      { companyId, financialYearId: fy.financialYearId, voucherType: "CASH RECEIPT", voucherNo, delete: 0 },
      ["paymentId"]
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

    // ---- Cash Receipt logic: Cash Account DR (paisa andar aaya), Opp Account CR ----
    const payment = await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "CASH RECEIPT",
      paymentCollectedByModules: "CR",
      voucherNo,
      date,
      selfAccountId: cashAccountId,
      selfDrOrCr: "DR",
      accountId: oppAccountId,
      accountDrOrCr: "CR",
      amount: Number(amount),
      narration: narration || "",
      paymentMode: "CASH",
      createdBy: createdBy != null ? Number(createdBy) : companyId,
      createdType: createdType || "Super Admin",
      status: "active",
      delete: 0,
    });

    // ---- Balance update — dono accounts ----
    await updateAccountBalance(cashAccountId, amount, "DR", companyId);
    await updateAccountBalance(oppAccountId, amount, "CR", companyId);

    return successResponse(res, { id: payment.paymentId, voucherNo }, "Cash receipt saved successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- CREATE BANK RECEIPT (Manual mode only) ----------------
const createBankReceipt = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      bankAccountId, voucherNo, date, oppAccountId, amount, transactionMode,
      chequeNo, chequeDate, chequeClearDate, narration, financialYearId,
      createdBy, createdType,
    } = req.body;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- Voucher No duplicate protection ----
    const dupCheck = await selectWithJoins(
      "payment", [],
      { companyId, financialYearId: fy.financialYearId, voucherType: "BANK RECEIPT", voucherNo, delete: 0 },
      ["paymentId"]
    );
    if (dupCheck.length > 0) {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }

    // ---- Bank account validate ----
    const bankRows = await selectWithJoins("account", [], { id: bankAccountId, companyId, delete: 0 }, ["id"]);
    if (bankRows.length === 0) return errorResponse(res, "Selected bank account is invalid.");

    // ---- Opp account validate ----
    const oppRows = await selectWithJoins("account", [], { id: oppAccountId, companyId, delete: 0 }, ["id"]);
    if (oppRows.length === 0) return errorResponse(res, "Selected opp. account is invalid.");

    // ---- Cheque mode ho to cheque fields double-check server side ----
    const modeUpper = String(transactionMode || "").toUpperCase();
    if (modeUpper === "CHEQUE" && (!chequeNo || !chequeDate)) {
      return errorResponse(res, "Cheque number and cheque date are required for cheque mode.");
    }

    // ---- Bank Receipt logic: Bank Account DR (paisa andar aaya), Opp Account CR ----
    const payment = await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "BANK RECEIPT",
      voucherNo,
      paymentCollectedByModules: "BR",
      date,
      selfAccountId: bankAccountId,
      selfDrOrCr: "DR",
      accountId: oppAccountId,
      accountDrOrCr: "CR",
      amount: Number(amount),
      narration: narration || "",
      paymentMode: modeUpper,
      chequeNo: modeUpper === "CHEQUE" ? chequeNo : null,
      chequeDate: modeUpper === "CHEQUE" ? chequeDate : null,
      chequeClearDate: modeUpper === "CHEQUE" ? (chequeClearDate || null) : null,
      createdBy: createdBy != null ? Number(createdBy) : companyId,
      createdType: createdType || "Super Admin",
      status: "active",
      delete: 0,
    });

    // ---- Balance update — dono accounts ----
    await updateAccountBalance(bankAccountId, amount, "DR", companyId);
    await updateAccountBalance(oppAccountId, amount, "CR", companyId);

    return successResponse(res, { id: payment.paymentId, voucherNo }, "Bank receipt saved successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (Cash Receipt only) ----------------
const getCashReceiptList = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const where = { companyId, voucherType: "CASH RECEIPT", delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const rows = await selectWithJoins(
      "payment", [], where,
      [
        "paymentId", "voucherNo", "date", "selfAccountId", "accountId",
        "amount", "narration","paymentMode", "createdBy", "createdType",
      ]
    );

    if (!rows.length) return successResponse(res, [], "Cash receipt list fetched successfully");

    const accountIds = [...new Set([...rows.map(r => r.selfAccountId), ...rows.map(r => r.accountId)])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.accountName; });

    const createdByMap = await resolveCreatedByNames(rows);

    const data = rows.map(r => ({
      id: String(r.paymentId),
      voucherNo: r.voucherNo,
      date: r.date,
      cashAccount: accMap[r.selfAccountId] || "",
      oppAccount: accMap[r.accountId] || "",
      amount: String(r.amount),
      narration: r.narration || "",
      paymentMode:r.paymentMode,
      createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
      createdType: r.createdType || "",
    }));

    return successResponse(res, data, "Cash receipt list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (Bank Receipt only) ----------------
const getBankReceiptList = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const where = { companyId, voucherType: "BANK RECEIPT", delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const rows = await selectWithJoins(
      "payment", [], where,
      [
        "paymentId", "voucherNo", "date", "selfAccountId", "accountId",
        "amount", "paymentMode", "narration", "createdBy", "createdType",
      ]
    );

    if (!rows.length) return successResponse(res, [], "Bank receipt list fetched successfully");

    const accountIds = [...new Set([...rows.map(r => r.selfAccountId), ...rows.map(r => r.accountId)])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.accountName; });

    const createdByMap = await resolveCreatedByNames(rows);

    const data = rows.map(r => ({
      id: String(r.paymentId),
      voucherNo: r.voucherNo,
      date: r.date,
      bankAccount: accMap[r.selfAccountId] || "",
      oppAccount: accMap[r.accountId] || "",
      amount: String(r.amount),
      transactionMode: (r.paymentMode || "").toLowerCase(),
      narration: r.narration || "",
      createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
      createdType: r.createdType || "",
    }));

    return successResponse(res, data, "Bank receipt list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};
// ---------------- CREATE CONTRA (Cash Deposit / Cash Withdrawal / Bank Transfer) ----------------
const createContra = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      type,          // "deposit" | "withdrawal" | "transfer" — sirf module-code/tracking ke liye
      accountId,     // selected account (Cash Account / Bank Account / Bank Account From)
      voucherNo,
      date,
      oppAccountId,  // opposite account
      amount,
      narration,
      financialYearId,
      createdBy,
      createdType,
    } = req.body;

    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    // ---- Voucher No duplicate protection ----
    const dupCheck = await selectWithJoins(
      "payment", [],
      { companyId, financialYearId: fy.financialYearId, voucherType: "CONTRA", voucherNo, delete: 0 },
      ["paymentId"]
    );
    if (dupCheck.length > 0) {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }

    // ---- Self account validate ----
    const selfRows = await selectWithJoins("account", [], { id: accountId, companyId, delete: 0 }, ["id"]);
    if (selfRows.length === 0) return errorResponse(res, "Selected account is invalid.");

    // ---- Opp account validate ----
    const oppRows = await selectWithJoins("account", [], { id: oppAccountId, companyId, delete: 0 }, ["id"]);
    if (oppRows.length === 0) return errorResponse(res, "Selected opposite account is invalid.");

    if (Number(accountId) === Number(oppAccountId)) {
      return errorResponse(res, "Account and opposite account cannot be the same.");
    }

    // ---- Type ke hisaab se module code (sirf tracking/report ke liye) ----
    const contraType = String(type || "").toLowerCase();
    const moduleCode =
      contraType === "deposit" ? "CTD" :
      contraType === "withdrawal" ? "CTW" :
      contraType === "transfer" ? "CTT" : "CTR";

    // ---- Contra logic: Self Account CR (paisa bahar gaya), Opp Account DR (paisa andar aaya) ----
    const payment = await saveModel("payment", {
      companyId,
      financialYearId: fy.financialYearId,
      voucherType: "CONTRA",
      paymentCollectedByModules: moduleCode,
      voucherNo,
      date,
      selfAccountId: accountId,
      selfDrOrCr: "CR",
      accountId: oppAccountId,
      accountDrOrCr: "DR",
      amount: Number(amount),
      narration: narration || "",
      paymentMode: "CONTRA",
      createdBy: createdBy != null ? Number(createdBy) : companyId,
      createdType: createdType || "Super Admin",
      status: "active",
      delete: 0,
    });

    // ---- Balance update — dono accounts ----
    await updateAccountBalance(accountId, amount, "CR", companyId);
    await updateAccountBalance(oppAccountId, amount, "DR", companyId);

    return successResponse(res, { id: payment.paymentId, voucherNo }, "Contra saved successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This voucher number already exists for this financial year.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (Contra only) ----------------
const getContraList = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const where = { companyId, voucherType: "CONTRA", delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const rows = await selectWithJoins(
      "payment", [], where,
      [
        "paymentId", "voucherNo", "date", "selfAccountId", "accountId",
        "amount", "paymentCollectedByModules", "narration", "createdBy", "createdType",
      ]
    );

    if (!rows.length) return successResponse(res, [], "Contra list fetched successfully");

    const accountIds = [...new Set([...rows.map(r => r.selfAccountId), ...rows.map(r => r.accountId)])];
    const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.accountName; });

    const createdByMap = await resolveCreatedByNames(rows);

    // ---- module code -> readable type ----
    const codeToType = { CTD: "deposit", CTW: "withdrawal", CTT: "transfer" };

    const data = rows.map(r => ({
      id: String(r.paymentId),
      type: codeToType[r.paymentCollectedByModules] || "deposit",
      voucherNo: r.voucherNo,
      date: r.date,
      account: accMap[r.selfAccountId] || "",
      oppAccount: accMap[r.accountId] || "",
      amount: String(r.amount),
      narration: r.narration || "",
      createdBy: getCreatedByName(createdByMap, r.createdType, r.createdBy),
      createdType: r.createdType || "",
    }));

    return successResponse(res, data, "Contra list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};
module.exports = {
  getNextVoucherNo,
  createCashPayment,
  getCashPaymentList,
  createBankPayment,
  getBankPaymentList,
  getCashBook,
  getBankBook,
   createCashReceipt,
  getCashReceiptList,
  createBankReceipt,
  getBankReceiptList,
    createContra,      
  getContraList
};