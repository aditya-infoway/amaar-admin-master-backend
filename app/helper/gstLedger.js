const { saveModel, updateModel, selectWithJoins } = require("./index.js");
const { updateAccountBalance } = require("./accountBalance.js");

const DUTIES_TAXES_GROUP_ID = 8;
const round2 = (n) => Number(Number(n).toFixed(2));

const GST_ACCOUNTS = {
    CGST: { accountName: "Purchase CGST", mobileNo: "GST-CGST" },
    SGST: { accountName: "Purchase SGST", mobileNo: "GST-SGST" },
    IGST: { accountName: "Purchase IGST", mobileNo: "GST-IGST" },
};
const PURCHASE_CODES = { CGST: "PCGST", SGST: "PSGST", IGST: "PIGST" };
const DEBIT_NOTE_CODES = { CGST: "DCGST", SGST: "DSGST", IGST: "DIGST" };
const PURCHASE_CODE_LIST = Object.values(PURCHASE_CODES);
const DEBIT_NOTE_CODE_LIST = Object.values(DEBIT_NOTE_CODES);
const ALL_GST_CODES = [...PURCHASE_CODE_LIST, ...DEBIT_NOTE_CODE_LIST];
const GST_NAMES = Object.values(GST_ACCOUNTS).map((a) => a.accountName.toLowerCase());

// used to lock edit/delete in the Account master
const isProtectedGstAccount = (acc) =>
    Number(acc?.groupId) === DUTIES_TAXES_GROUP_ID &&
    GST_NAMES.includes(String(acc?.accountName || "").trim().toLowerCase());

// ---------------- default accounts (same idempotent pattern as item categories) ----------------
const syncDefaultGstAccounts = async (companyId) => {
    const existingRows = await selectWithJoins(
        "account", [], { companyId },
        ["id", "accountName", "groupId", "delete"]
    );

    for (const acc of Object.values(GST_ACCOUNTS)) {
        const existing = existingRows.find(
            (r) => String(r.accountName || "").trim().toLowerCase() === acc.accountName.toLowerCase()
        );

        if (existing) {
            if (Number(existing.delete) !== 0 || Number(existing.groupId) !== DUTIES_TAXES_GROUP_ID) {
                await updateModel(
                    "account",
                    { groupId: DUTIES_TAXES_GROUP_ID, delete: 0, status: "active", updated: new Date() },
                    { id: existing.id, companyId }
                );
            }
            continue;
        }

        await saveModel("account", {
            companyId,
            accountName: acc.accountName,
            printName: acc.accountName,
            groupId: DUTIES_TAXES_GROUP_ID,
            openingBalance: 0, drOrCr: "DR",
            currentBalance: 0, currentDrOrCr: "DR",
            countryName: "India", stateName: "-", addressLine1: "-", pincode: "-",
            mobileNo: acc.mobileNo,
            status: "active",
            delete: 0,
        });
    }
    return true;
};

const getGstAccountMap = async (companyId) => {
    const build = async () => {
        const rows = await selectWithJoins(
            "account", [],
            { companyId, groupId: DUTIES_TAXES_GROUP_ID, delete: 0 },
            ["id", "accountName"]
        );
        const map = {};
        for (const [key, { accountName }] of Object.entries(GST_ACCOUNTS)) {
            const hit = rows.find((r) => String(r.accountName).trim().toLowerCase() === accountName.toLowerCase());
            if (hit) map[key] = hit;
        }
        return map;
    };
    let map = await build();
    if (Object.keys(map).length < 3) {          // self-heal so a purchase never fails
        await syncDefaultGstAccounts(companyId);
        map = await build();
    }
    return map;
};

// ---------------- generic poster: one single-sided payment row per GST account ----------------
const postGstEntries = async ({
    companyId, financialYearId, date, cgst, sgst, igst, drOrCr, codes,
    voucherType, voucherNoBase, purchaseId, narration, createdBy, createdType,
}) => {
    const accMap = await getGstAccountMap(companyId);
    const lines = [["CGST", cgst], ["SGST", sgst], ["IGST", igst]].filter(([, a]) => Number(a) > 0);

    for (const [key, a] of lines) {
        const acc = accMap[key];
        if (!acc) throw new Error(`Default ${key} account not found.`);
        const amount = round2(a);

        await saveModel("payment", {
            companyId,
            financialYearId,
            voucherType,
            paymentCollectedByModules: codes[key],
            voucherNo: voucherNoBase ? `${voucherNoBase}/${key}` : null, // suffix keeps voucherNo unique per row
            date,
            selfAccountId: acc.id,
            selfDrOrCr: drOrCr,
            accountId: acc.id,                 // single-sided, same pattern as the PUR / DN rows
            accountDrOrCr: drOrCr,
            amount,
            narration,
            paymentMode: "CREDIT",
            purchaseId: purchaseId || null,
            createdBy, createdType,
            status: "active",
            delete: 0,
        });
        await updateAccountBalance(acc.id, amount, drOrCr, companyId);
    }
};

// Purchase -> DR on GST accounts
const postPurchaseGst = ({ supplierName, purchaseBillNo, ...rest }) =>
    postGstEntries({
        ...rest,
        drOrCr: "DR",
        codes: PURCHASE_CODES,
        voucherType: "PURCHASE GST",
        narration: `${purchaseBillNo || ""} — ${supplierName || ""}`.trim(),
    });

// Debit Note -> CR on GST accounts (reverses the GST of the returned goods)
const postDebitNoteGst = ({ debitNoteNo, supplierName, ...rest }) =>
    postGstEntries({
        ...rest,
        drOrCr: "CR",
        codes: DEBIT_NOTE_CODES,
        voucherType: "DEBIT NOTE GST",
        voucherNoBase: debitNoteNo,
        narration: `${debitNoteNo || ""} — ${supplierName || ""}`.trim(),
    });

// reverse a purchase's GST (call before re-posting on edit, and on delete)
const reversePurchaseGst = async (companyId, purchaseId) => {
    const rows = await selectWithJoins(
        "payment", [],
        { companyId, purchaseId, paymentCollectedByModules: PURCHASE_CODE_LIST, delete: 0 },
        ["paymentId", "selfAccountId", "selfDrOrCr", "amount"]
    );
    for (const r of rows) {
        await updateAccountBalance(r.selfAccountId, Number(r.amount), r.selfDrOrCr === "DR" ? "CR" : "DR", companyId);
        await updateModel("payment", { delete: 1, updated: new Date() }, { paymentId: r.paymentId, companyId });
    }
};

// ---------------- back-fill (idempotent, safe to re-run) ----------------
const backfillGst = async (companyId) => {
    await syncDefaultGstAccounts(companyId);
    const result = { purchases: 0, debitNotes: 0 };

    // ---- purchases ----
    const purchases = await selectWithJoins(
        "purchase", [], { companyId, delete: 0 },
        ["purchaseId", "financialYearId", "purchaseDate", "purchaseBillNo", "accountId",
            "cgstAmount", "sgstAmount", "igstAmount", "createdBy", "createdType"]
    );
    const donePur = await selectWithJoins(
        "payment", [], { companyId, delete: 0, paymentCollectedByModules: PURCHASE_CODE_LIST }, ["purchaseId"]
    );
    const donePurSet = new Set(donePur.map((d) => d.purchaseId));
    const todoPur = purchases.filter(
        (p) => !donePurSet.has(p.purchaseId) &&
            (Number(p.cgstAmount) > 0 || Number(p.sgstAmount) > 0 || Number(p.igstAmount) > 0)
    );

    // ---- debit notes ----
    const notes = await selectWithJoins(
        "debitnote", [], { companyId, delete: 0 },
        ["debitNoteId", "debitNoteNo", "debitNoteDate", "financialYearId", "supplierId",
            "purchaseOrderId", "gstAmount", "createdBy", "createdType"]
    );
    const doneDn = await selectWithJoins(
        "payment", [], { companyId, delete: 0, paymentCollectedByModules: DEBIT_NOTE_CODE_LIST }, ["voucherNo"]
    );
    const doneDnSet = new Set(doneDn.map((d) => d.voucherNo));
    const todoDn = notes.filter(
        (n) => Number(n.gstAmount) > 0 &&
            !["CGST", "SGST", "IGST"].some((k) => doneDnSet.has(`${n.debitNoteNo}/${k}`))
    );

    // supplier names + bill (for igst / purchaseId) lookups
    const accIds = [...new Set([...todoPur.map((p) => p.accountId), ...todoDn.map((n) => n.supplierId)])];
    const nameMap = {};
    if (accIds.length) {
        (await selectWithJoins("account", [], { id: accIds, companyId }, ["id", "accountName"]))
            .forEach((a) => { nameMap[a.id] = a.accountName; });
    }
    const poIds = [...new Set(todoDn.map((n) => n.purchaseOrderId).filter(Boolean))];
    const billByPo = {};
    if (poIds.length) {
        (await selectWithJoins("purchase", [], { purchaseOrderId: poIds, companyId, delete: 0 },
            ["purchaseId", "purchaseOrderId", "igstAmount"]))
            .forEach((b) => { if (!billByPo[b.purchaseOrderId]) billByPo[b.purchaseOrderId] = b; });
    }

    for (const p of todoPur) {
        await postPurchaseGst({
            companyId, financialYearId: p.financialYearId, purchaseId: p.purchaseId, date: p.purchaseDate,
            cgst: p.cgstAmount, sgst: p.sgstAmount, igst: p.igstAmount,
            supplierName: nameMap[p.accountId], purchaseBillNo: p.purchaseBillNo,
            createdBy: p.createdBy, createdType: p.createdType,
        });
        result.purchases++;
    }

    for (const n of todoDn) {
        const bill = billByPo[n.purchaseOrderId];
        const gst = Number(n.gstAmount);
        const inter = Number(bill?.igstAmount) > 0;       // same rule as loadSource
        const cgst = inter ? 0 : round2(gst / 2);
        await postDebitNoteGst({
            companyId, financialYearId: n.financialYearId, date: n.debitNoteDate,
            cgst, sgst: inter ? 0 : round2(gst - cgst), igst: inter ? gst : 0,
            debitNoteNo: n.debitNoteNo, supplierName: nameMap[n.supplierId],
            purchaseId: bill?.purchaseId || null,
            createdBy: n.createdBy, createdType: n.createdType,
        });
        result.debitNotes++;
    }
    return result;
};

module.exports = {
    ALL_GST_CODES, isProtectedGstAccount, syncDefaultGstAccounts,
    postPurchaseGst, postDebitNoteGst, reversePurchaseGst, backfillGst,
};