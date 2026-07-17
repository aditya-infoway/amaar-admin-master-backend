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
      birthdayOn: birthdayOn || null, anniversary: anniversary || null,
      bankAccountNo: bankAccountNo || "", bankName: bankName || "",
      ifscCode: ifscCode || "", branchName: branchName || "",
      gstNo: gstNo || "", panCard: panCard || "", aadharCardNo: aadharCardNo || "",
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

    return successResponse(res, list, "Account list fetched successfully");
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

    return successResponse(res, rows[0], "Account fetched successfully");
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
      ["id", "openingBalance", "drOrCr", "currentBalance", "currentDrOrCr"]
    );

    if (existing.length === 0) return requiredmessage(res, "Account not found");

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

    const current = existing[0];
    const openingChanged =
      Number(current.openingBalance) !== Number(openingBalance || 0) ||
      current.drOrCr !== drOrCr;

    const updatePayload = {
      ...rest,
      mobileNo: mobileNo.trim(),
      updated: new Date(),
    };

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
      ["id"]
    );

    if (existing.length === 0) return requiredmessage(res, "Account not found");

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
};