const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  errorResponse,
  successResponse,
  requiredmessage,
  selectWithJoins,
  updateModel,
} = require("../../../helper/index.js");
const { employeeLogin } = require("../../employee/logincontroller.js");

const { Op } = require("sequelize");
const db = require("../../../modelses/index.js"); // adjust path if needed
const { todayIST } = require("../../../helper/checkCompanyToken.js");

const roleConfig = {
  "Super Admin": {
    table: "company",
    idField: "companyId",
    extraFields: ["companyName", "expiryDate"],
    hasTokenDate: true,
  },
  Employee: {
    table: "employee",
    idField: "employeeId",
    extraFields: ["companyId", "employeeName"],
    hasTokenDate: false,
  },
};

// ---- Login ----
const companyLogin = async (req, res) => {
  try {
    // const email = req.body.email || "";
    // const password = req.body.password || "";
    const email = req.body.email || "";
    const password = req.body.password || "";
    const role = req.body.role || "";


     console.log("companyLogin hit — role received:", JSON.stringify(role));

    // if (!email || !password) {
    //   return requiredmessage(res, "Email and Password are required.");
    // }

    if (!email || !password || !role) {
      return requiredmessage(res, "Email, Password and Role are required.");
    }

     // Employee has its own fully-built login (geofencing, attendance, expiry) —
     // delegate instead of reimplementing it here.
     if (role === "Employee") {
       console.log("delegating to employeeLogin...");
       return employeeLogin(req, res);
     }

    const config = roleConfig[role];
    if (!config) {
      return requiredmessage(res, "Invalid role selected.");
    }

    // const rows = await selectWithJoins("company", [], { email, delete: 0 }, [
    //   "companyId",
    //   "companyName",
    //   "email",
    //   "password",
    //   "expiryDate",
    //   "token",
    //   "tokenDate",
    // ]);

    const rows = await selectWithJoins(config.table, [], { email, delete: 0 }, [
      config.idField,
      "email",
      "password",
      "token",
      ...(config.hasTokenDate ? ["tokenDate"] : []),
      ...config.extraFields,
    ]);
    if (rows.length === 0) {
      return requiredmessage(res, "Invalid Email or Password");
    }

    // const company = rows[0];
    const account = rows[0];

    // const isPasswordValid = await bcrypt.compare(password, company.password);
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      return requiredmessage(res, "Invalid Email or Password");
    }

    // ---- Expiry date check ----
    // if (company.expiryDate) {
    //   const expiry = new Date(company.expiryDate);
    if (role === "Super Admin" && account.expiryDate) {
      const expiry = new Date(account.expiryDate);
      const today = new Date();
      expiry.setHours(23, 59, 59, 999);

      if (expiry < today) {
        return requiredmessage(
          res,
          "Your subscription has expired. Please contact the administrator to renew.",
        );
      }
    }

    const today = todayIST();
    // let token = company.token;
    let token = account.token;

    // no token yet, or token is from an earlier day → first login of today
    // if (!token || company.tokenDate !== today) {
    const needsNewToken = config.hasTokenDate
      ? !token || account.tokenDate !== today
      : true;
    if (needsNewToken) {
      const newToken = crypto.randomBytes(30).toString("hex");

      // only succeeds for the first login of the day
      // await db.company.update(
      await db[config.table].update(
        // { token: newToken, tokenDate: today, updated: new Date() },
        {
          token: newToken,
          ...(config.hasTokenDate ? { tokenDate: today } : {}),
          updated: new Date(),
        },
        {
          // where: {
          //   companyId: company.companyId,
          //   delete: 0,
          //   [Op.or]: [{ tokenDate: null }, { tokenDate: { [Op.ne]: today } }],
          // },
          where: config.hasTokenDate
            ? {
                [config.idField]: account[config.idField],
                delete: 0,
                [Op.or]: [
                  { tokenDate: null },
                  { tokenDate: { [Op.ne]: today } },
                ],
              }
            : { [config.idField]: account[config.idField], delete: 0 },

          silent: true, // don't touch an updatedAt column, your table doesn't have one
        },
      );

      // read back whichever token won (yours, or one created a moment ago)
      // const fresh = await db.company.findOne({
      //   where: { companyId: company.companyId },
      const fresh = await db[config.table].findOne({
        where: { [config.idField]: account[config.idField] },
        attributes: ["token"],
        raw: true,
      });
      token = fresh.token;
    }
    const responseData = {
      // companyId: company.companyId,
      // companyName: company.companyName,
      // email: company.email,
      // token,
      role,
      token,
      email: account.email,
      ...(role === "Super Admin"
        ? { companyId: account.companyId, companyName: account.companyName }
        : {
            companyId: account.companyId,
            employeeId: account.employeeId,
            employeeName: account.employeeName,
          }),
    };

    return successResponse(res, responseData, "Login Successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---- Example protected route: logged-in company ka apna profile ----
const getProfile = async (req, res) => {
  try {
    const rows = await selectWithJoins(
      "company",
      [],
      { companyId: req.companyId, delete: 0 },
      [
        "companyId",
        "companyName",
        "companyAddress",
        "email",
        "contactNumber",
        "expiryDate",
      ],
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Company not found.");
    }

    return successResponse(res, rows[0], "Profile fetched successfully.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  companyLogin,
  getProfile,
};
