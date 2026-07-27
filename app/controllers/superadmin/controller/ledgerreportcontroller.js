const {
  successResponse,
  errorResponse,
  requiredmessage,
  selectWithJoins,
  selectWithJoinsV2,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");

// ---------------- LEDGER REPORT LIST (existing) ----------------
const LEDGER_GROUP_IDS = [1, 4, 30, 31, 34, 35, 36];
const DEFAULT_GROUP_IDS = [8, 24, 27, 38, 39];
const CASH_BANK_GROUP_IDS = [1, 4];

const getLedgerReportList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { type = "ledger", search = "" } = req.query;

    const filters = {
      'account."companyId"': companyId,
      'account."delete"': 0,
    };

    if (type === "ledger") {
      filters['account."groupId"'] = { IN: `(${LEDGER_GROUP_IDS.join(",")})` };
    } else if (type === "default") {
      filters['account."groupId"'] = { IN: `(${DEFAULT_GROUP_IDS.join(",")})` };
    }

    const list = await selectWithJoinsV2(
      "account",
      [
        {
          table: '"group"',
          alias: "g",
          onClause: { "g.id": { "=": 'account."groupId"' } },
        },
      ],
      filters,
      [
        "account.id",
        'account."accountName"',
        'g."groupName" AS "groupName"',
        'account."addressLine1"',
        'account."cityName"',
        'account."stateName"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    const q = String(search).trim().toLowerCase();
    const filtered = q
      ? list.filter((row) =>
          [row.accountName, row.cityName, row.stateName]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : list;

    return successResponse(res, filtered, "Ledger report fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- PARTICULARS LABEL (PHP getParticularsLabel ka JS version) ----------------
const PARTICULARS_LABELS = {
  CP: "Cash Payment",
  BP: "Bank Payment",
  CR: "Cash Receipt",
  BR: "Bank Receipt",
  LCR: "Lead Cash Receipt",
  LBR: "Lead Bank Receipt",
  DCR: "Down Payment Cash Receipt",
  DBR: "Down Payment Bank Receipt",
  RFCP: "Refund Cash Payment",
  RFBP: "Refund Bank Payment",
  PCP: "Purchase Cash Payment",
  PBP: "Purchase Bank Payment",
  PUR: "Purchase — Credit",
  "A.PUR": "Accessories Purchase — Credit",
  JNRL: "Journal Entry",
  JCR: "Journal Cash Receipt",
  JBR: "Journal Bank Receipt",
  OB: "Opening Balance",
  SALE: "Sale",
  FIN: "Finance",
};

const getParticularsLabel = (moduleCode, oppName) => {
  const label = PARTICULARS_LABELS[moduleCode] || moduleCode || "-";
  return oppName ? `${label} — ${oppName}` : label;
};

// ---------------- LEDGER DETAILS (account-wise, payment table se) ----------------
const getLedgerDetails = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { accountId, fromDate, toDate, financialYearId } = req.query;
    if (!accountId) return errorResponse(res, "Account id is required.");

    // ---- Account + group fetch ----
    const accRows = await selectWithJoinsV2(
      "account",
      [
        {
          table: '"group"',
          alias: "g",
          onClause: { "g.id": { "=": 'account."groupId"' } },
        },
      ],
      {
        "account.id": Number(accountId),
        'account."companyId"': companyId,
        'account."delete"': 0,
      },
      [
        "account.id",
        'account."accountName"',
        'account."groupId"',
        'g."groupName" AS "groupName"',
        'account."openingBalance"',
        'account."drOrCr"',
      ],
      [],
      0,
      0
    );

    if (!accRows.length) return requiredmessage(res, "Account not found.");
    const account = accRows[0];
    const groupId = Number(account.groupId);
    const isCashBank = CASH_BANK_GROUP_IDS.includes(groupId);

    // ---- Financial Year ----
    const fy = financialYearId ? await getFinancialYearById(financialYearId, companyId) : null;
    const fyStartDate = fy?.startDate || fromDate || new Date().toISOString().slice(0, 10);
    const effectiveFromDate = fromDate || fyStartDate;
    const effectiveToDate = toDate || new Date().toISOString().slice(0, 10);

    // ---- FY-wise opening balance override (accountopeningbalance), fallback account default ----
    let openingBalance = Number(account.openingBalance) || 0;
    let openingDrOrCr = account.drOrCr || "DR";

    if (fy) {
      const obRows = await selectWithJoins(
        "accountopeningbalance",
        [],
        { companyId, financialYearId: fy.financialYearId, accountId: Number(accountId), delete: 0 },
        ["openingBalance", "drOrCr"]
      );
      if (obRows.length) {
        openingBalance = Number(obRows[0].openingBalance);
        openingDrOrCr = obRows[0].drOrCr;
      }
    }

    const fyOpeningSigned = openingDrOrCr === "CR" ? -openingBalance : openingBalance;

    // ---- Payment rows jisme ye account involve ho ----
    // groupId 1/4 (Cash/Bank) -> account "self" side pe hota he
    // baaki groups (Customer/Supplier/etc) -> account "opp" side pe hota he
    const where = { companyId, delete: 0 };
    if (isCashBank) {
      where.selfAccountId = Number(accountId);
    } else {
      where.accountId = Number(accountId);
    }

    let rows = await selectWithJoins(
      "payment",
      [],
      where,
      [
        "paymentId", "date", "voucherNo", "voucherType", "paymentCollectedByModules",
        "selfAccountId", "selfDrOrCr", "accountId", "accountDrOrCr", "amount", "narration",
      ]
    );

    rows = rows.sort(
      (a, b) => (new Date(a.date) - new Date(b.date)) || (a.paymentId - b.paymentId)
    );

    // ---- Opp account names (batch fetch) ----
    const oppIds = [
      ...new Set(rows.map((r) => (isCashBank ? r.accountId : r.selfAccountId)).filter(Boolean)),
    ];
    let oppMap = {};
    if (oppIds.length) {
      const oppAccounts = await selectWithJoins(
        "account", [], { id: oppIds, companyId, delete: 0 }, ["id", "accountName"]
      );
      oppAccounts.forEach((a) => { oppMap[a.id] = a.accountName; });
    }

    // ---- Split: FY start → fromDate (opening calc) vs fromDate → toDate (display) ----
    const beforeRows = rows.filter(
      (r) => String(r.date) >= String(fyStartDate) && String(r.date) < String(effectiveFromDate)
    );
    const inRangeRows = rows.filter(
      (r) => String(r.date) >= String(effectiveFromDate) && String(r.date) <= String(effectiveToDate)
    );

    const resolveDebitCredit = (r) => {
      const drOrCr = isCashBank ? r.selfDrOrCr : r.accountDrOrCr;
      const debit = drOrCr === "DR" ? Number(r.amount) : 0;
      const credit = drOrCr === "CR" ? Number(r.amount) : 0;
      return [debit, credit];
    };

    let runningBalance = fyOpeningSigned;
    beforeRows.forEach((r) => {
      const [debit, credit] = resolveDebitCredit(r);
      runningBalance += debit - credit;
    });

    const openingBalanceForRange = runningBalance;

    const list = [
      {
        sr: 1,
        date: effectiveFromDate,
        voucherNo: "-",
        type: "OB",
        particulars: "Opening Balance",
        debit: openingBalanceForRange >= 0 ? openingBalanceForRange.toFixed(2) : "",
        credit: openingBalanceForRange < 0 ? Math.abs(openingBalanceForRange).toFixed(2) : "",
        balance: `${Math.abs(openingBalanceForRange).toFixed(2)} ${openingBalanceForRange >= 0 ? "DR" : "CR"}`,
      },
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    inRangeRows.forEach((r) => {
      const [debit, credit] = resolveDebitCredit(r);
      totalDebit += debit;
      totalCredit += credit;
      runningBalance += debit - credit;

      const oppId = isCashBank ? r.accountId : r.selfAccountId;
      const oppName = oppMap[oppId] || "";
      const moduleCode = r.paymentCollectedByModules || r.voucherType || "";

      list.push({
        sr: list.length + 1,
        date: r.date,
        voucherNo: r.voucherNo || "-",
        type: moduleCode,
        particulars: getParticularsLabel(moduleCode, oppName),
        debit: debit ? debit.toFixed(2) : "",
        credit: credit ? credit.toFixed(2) : "",
        balance: `${Math.abs(runningBalance).toFixed(2)} ${runningBalance >= 0 ? "DR" : "CR"}`,
      });
    });

    return successResponse(
      res,
      {
        account: {
          id: account.id,
          accountName: account.accountName,
          groupName: account.groupName,
        },
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
        openingBalance: openingBalanceForRange.toFixed(2),
        openingBalanceLabel: `${Math.abs(openingBalanceForRange).toFixed(2)} ${openingBalanceForRange >= 0 ? "DR" : "CR"}`,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        closingBalance: runningBalance.toFixed(2),
        closingBalanceLabel: `${Math.abs(runningBalance).toFixed(2)} ${runningBalance >= 0 ? "DR" : "CR"}`,
        list,
      },
      "Ledger details fetched successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getLedgerReportList,
  getLedgerDetails,
};