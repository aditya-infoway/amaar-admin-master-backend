const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  errorResponse,
  successResponse,
  requiredmessage,
  selectWithJoins,
  updateModel,
} = require("../../../helper/index.js");

// ---- Login ----
const companyLogin = async (req, res) => {
  try {
    const email = req.body.email || "";
    const password = req.body.password || "";

    if (!email || !password) {
      return requiredmessage(res, "Email and Password are required.");
    }

    const rows = await selectWithJoins(
      "company",
      [],
      { email, delete: 0 },
      ["companyId", "companyName", "email", "password", "expiryDate"]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Invalid Email or Password");
    }

    const company = rows[0];

    const isPasswordValid = await bcrypt.compare(password, company.password);
    if (!isPasswordValid) {
      return requiredmessage(res, "Invalid Email or Password");
    }

    // ---- Expiry date check ----
    if (company.expiryDate) {
      const expiry = new Date(company.expiryDate);
      const today = new Date();
      expiry.setHours(23, 59, 59, 999);

      if (expiry < today) {
        return requiredmessage(
          res,
          "Your subscription has expired. Please contact the administrator to renew."
        );
      }
    }

    const token = crypto.randomBytes(30).toString("hex");

    await updateModel(
      "company",
      { token, updated: new Date() },
      { companyId: company.companyId, delete: 0 }
    );

    const responseData = {
      companyId: company.companyId,
      companyName: company.companyName,
      email: company.email,
      token,
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
      ]
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