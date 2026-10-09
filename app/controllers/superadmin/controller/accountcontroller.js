const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
  selectWithJoinsV2,
} = require("../../../helper/index.js");

const { accountopeningbalance: AccountOpeningBalance } = require("../../../modelses");
const { isProtectedGstAccount, syncDefaultGstAccounts } = require("../../../helper/gstLedger.js");

// ---------------- Date helpers ----------------
// Sequelize's DATEONLY type casts the value with moment.js before binding it to the
// SQL query. moment("").format() (or moment(<garbage>).format()) returns the literal
// string "Invalid date" — which Postgres then rejects with
// "invalid input syntax for type date". So ANY value that isn't a clean YYYY-MM-DD
// string must become null before it reaches Sequelize.
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const normalizeDateOnly = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return DATE_ONLY_REGEX.test(trimmed) ? trimmed : null;
};



// ---------------- CREATE ----------------
const createAccount = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const {
      accountName, printName, groupId, openingBalance, drOrCr,
      countryName, stateName,
      districtName, talukaName, cityName, area,
      addressLine1, addressLine2, pincode, phoneNo, mobileNo,
      email, contactPersonName, birthdayOn, anniversary,
      bankAccountNo, bankName, ifscCode, branchName,
      gstNo, panCard, aadharCardNo, status, financialYearId,
    } = req.body;


    // mobile number companyId ke andar unique - ek hi baar allow
    const mobileExists = await selectWithJoins(
      "account",
      [],
      { mobileNo: mobileNo.trim(), companyId, delete: 0 },
      ["id"]
    );

    if (mobileExists.length > 0) {
      return errorResponse(res, "This mobile number is already registered for another account.");
    }

    // Aadhar / PAN / GST images — multer se req.files me aayenge (uploadKycImages middleware)
    const aadharImage = req.files?.aadharImage?.[0]
      ? `/uploads/account-kyc/${req.files.aadharImage[0].filename}`
      : "";
    const panImage = req.files?.panImage?.[0]
      ? `/uploads/account-kyc/${req.files.panImage[0].filename}`
      : "";
    const gstImage = req.files?.gstImage?.[0]
      ? `/uploads/account-kyc/${req.files.gstImage[0].filename}`
      : "";

    const payload = {
      companyId,
      accountName: accountName.trim(),
      printName: (printName || accountName).trim(),
      groupId,
      openingBalance: openingBalance || 0,
      drOrCr: drOrCr || "DR",
      currentBalance: openingBalance || 0,
      currentDrOrCr: drOrCr || "DR",
      countryName, stateName,
      districtName, talukaName, cityName, area,
      addressLine1, addressLine2: addressLine2 || "",
      pincode, phoneNo: phoneNo || "", mobileNo: mobileNo.trim(),
      email: email || "", contactPersonName: contactPersonName || "",
      birthdayOn: normalizeDateOnly(birthdayOn),
      anniversary: normalizeDateOnly(anniversary),
      bankAccountNo: bankAccountNo || "", bankName: bankName || "",
      ifscCode: ifscCode || "", branchName: branchName || "",
      gstNo: gstNo || "", panCard: panCard || "", aadharCardNo: aadharCardNo || "",
      aadharImage, panImage, gstImage,
      status: status || "active",
      delete: 0,
    };

    const account = await saveModel("account", payload);

    if (financialYearId) {
      await AccountOpeningBalance.create({
        companyId,
        financialYearId,
        accountId: account.id,
        openingBalance: openingBalance || 0,
        drOrCr: drOrCr || "DR",
        createdBy: companyId,
        createdType: "Super Admin",
      });
    }

    return successResponse(res, account, "Account created successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This mobile number is already registered for another account.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getAccountList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");
  try {
      await syncDefaultGstAccounts(companyId);
    } catch (syncError) {
      console.error("syncDefaultGstAccounts failed:", syncError.message);
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
      {
        'account."companyId"': companyId,   // 👈 quoted
        'account."delete"': 0,              // 👈 quoted — "delete" bhi reserved keyword hai
      },
      [
        "account.id",
        'account."accountName"',
        'account."groupId"',
        'account."printName"',
        'g."groupName" AS "groupName"',
        'account."drOrCr"',
        'account."countryName"',
        'account."stateName"',
        'account."cityName"',
        "account.area",
        'account."addressLine1"',
        'account."mobileNo"',
        'account."openingBalance"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
        "account.status",
        "account.created",
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    const data = list.map((r) => {
      const isDefault = isProtectedGstAccount(r);
      return { ...r, mobileNo: isDefault ? "-" : r.mobileNo, isDefault };
    });
    return successResponse(res, data, "Account list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getAccountById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { id } = req.params;

    const rows = await selectWithJoins(
      "account",
      [],
      { id, companyId, delete: 0 },
      ["*"]
    );

    if (rows.length === 0) return requiredmessage(res, "Account not found");

    const acc = rows[0].toJSON ? rows[0].toJSON() : rows[0];
    const isDefault = isProtectedGstAccount(acc);
    return successResponse(res, { ...acc, mobileNo: isDefault ? "-" : acc.mobileNo, isDefault }, "Account fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE ----------------
const updateAccount = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { accountId, mobileNo, openingBalance, drOrCr, financialYearId, ...rest } = req.body;

    const existing = await selectWithJoins(
      "account",
      [],
      { id: accountId, companyId, delete: 0 },
      ["id", "accountName", "groupId", "openingBalance", "drOrCr", "currentBalance", "currentDrOrCr"]
    );

    if (existing.length === 0) return requiredmessage(res, "Account not found");

    // default GST accounts: address/email etc. editable, but name, group and mobile are fixed
    const isDefaultAcc = isProtectedGstAccount(existing[0]);
    if (isDefaultAcc) {
      delete rest.accountName;
      delete rest.groupId;
      delete rest.subGroupId;
    }

    if (!isDefaultAcc) {
      const mobileExists = await selectWithJoins(
        "account",
        [],
        { mobileNo: mobileNo.trim(), companyId, delete: 0 },
        ["id"]
      );
      const mobileTakenByOther = mobileExists.some(
        (row) => String(row.id) !== String(accountId)
      );
      if (mobileTakenByOther) {
        return errorResponse(res, "This mobile number is already registered for another account.");
      }
    }

    const current = existing[0];
    const openingChanged =
      Number(current.openingBalance) !== Number(openingBalance || 0) ||
      current.drOrCr !== drOrCr;

    const updatePayload = {
      ...rest,
      updated: new Date(),
    };

    if (!isDefaultAcc) updatePayload.mobileNo = mobileNo.trim();

    // ---- Date fix ----
    // "" (empty string) ya kisi bhi non YYYY-MM-DD string ko null bana do, warna
    // Sequelize ka DATEONLY caster moment.js se "Invalid date" literal bana ke
    // Postgres ko bhej deta hai (jo DB error deta hai).
    if (Object.prototype.hasOwnProperty.call(updatePayload, "birthdayOn")) {
      updatePayload.birthdayOn = normalizeDateOnly(updatePayload.birthdayOn);
    }
    if (Object.prototype.hasOwnProperty.call(updatePayload, "anniversary")) {
      updatePayload.anniversary = normalizeDateOnly(updatePayload.anniversary);
    }

    // Aadhar / PAN / GST images — sirf tabhi update karo jab naya file bheja gaya ho.
    // File na bheje jaane par existing DB value untouched rehti hai (updateModelHelper
    // sirf updatePayload me diye gaye columns hi update karta hai).
    if (req.files?.aadharImage?.[0]) {
      updatePayload.aadharImage = `/uploads/account-kyc/${req.files.aadharImage[0].filename}`;
    }
    if (req.files?.panImage?.[0]) {
      updatePayload.panImage = `/uploads/account-kyc/${req.files.panImage[0].filename}`;
    }
    if (req.files?.gstImage?.[0]) {
      updatePayload.gstImage = `/uploads/account-kyc/${req.files.gstImage[0].filename}`;
    }

    if (openingChanged) {
      updatePayload.openingBalance = openingBalance || 0;
      updatePayload.drOrCr = drOrCr || "DR";
      updatePayload.currentBalance = openingBalance || 0;
      updatePayload.currentDrOrCr = drOrCr || "DR";

      if (financialYearId) {
        await AccountOpeningBalance.upsert({
          companyId,
          financialYearId,
          accountId,
          openingBalance: openingBalance || 0,
          drOrCr: drOrCr || "DR",
          createdBy: companyId,
          createdType: "Super Admin",
          updated: new Date(),
        });
      }
    }

    await updateModelHelper("account", updatePayload, { id: accountId, companyId });

    return successResponse(res, {}, "Account updated successfully");
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This mobile number is already registered for another account.");
    }
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteAccount = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { accountId } = req.body;

    const existing = await selectWithJoins(
      "account",
      [],
      { id: accountId, companyId, delete: 0 },
      ["id", "accountName", "groupId"]
    );

    if (existing.length === 0) return requiredmessage(res, "Account not found");

    if (isProtectedGstAccount(existing[0])) {
      return errorResponse(res, "Default GST accounts cannot be deleted.");
    }

    await updateModelHelper(
      "account",
      { delete: 1, updated: new Date() },
      { id: accountId, companyId }
    );

    return successResponse(res, {}, "Account deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getCashAccountList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "account",
      [],
      {
        'account."companyId"': companyId,
        'account."groupId"': 4,
        'account."delete"': 0,
      },
      [
        "account.id",
        'account."accountName"',
        'account."mobileNo"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Account list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getBankAccountList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "account",
      [],
      {
        'account."companyId"': companyId,
        'account."groupId"': 1,
        'account."delete"': 0,
      },
      [
        "account.id",
        'account."accountName"',
        'account."mobileNo"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Account list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getSupplierAccountList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "account",
      [],
      {
        'account."companyId"': companyId,
        'account."groupId"': { IN: "(30,34)" },
        'account."delete"': 0,
      },
      [
        "account.id",
        'account."accountName"',
        'account."mobileNo"',
        'account."email"',
        'account."cityName"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
        'account."stateName"',
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Account list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getCustomerAccountList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "account",
      [],
      {
        'account."companyId"': companyId,
        'account."groupId"': { IN: "(31,35)" },
        'account."delete"': 0,
      },
      [
        "account.id",
        'account."accountName"',
        'account."mobileNo"',
        'account."email"',
        'account."cityName"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
        'account."stateName"',
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Account list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

const getOppAccountList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "account",
      [],
      {
        'account."companyId"': companyId,
        'account."groupId"': { IN: "(30,31,34,35)" },
        'account."delete"': 0,
      },
      [
        "account.id",
        'account."accountName"',
        'account."mobileNo"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
        'account."stateName"',
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Account list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};
const getSundryCreditorAccountList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const list = await selectWithJoinsV2(
      "account",
      [],
      {
        'account."companyId"': companyId,
        'account."groupId"': 30,
        'account."delete"': 0,
      },
      [
        "account.id",
        'account."accountName"',
        'account."mobileNo"',
        'account."email"',
        'account."cityName"',
        'account."currentBalance"',
        'account."currentDrOrCr"',
        'account."stateName"',
      ],
      [["account.id", "DESC"]],
      0,
      0
    );

    return successResponse(res, list, "Sundry Creditor account list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};
module.exports = {
  createAccount,
  getAccountList,
  getAccountById,
  updateAccount,
  deleteAccount,
  getCashAccountList,
  getBankAccountList,
  getSupplierAccountList,
  getCustomerAccountList,
  getOppAccountList,
  getSundryCreditorAccountList
};