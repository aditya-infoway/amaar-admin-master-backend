const nodemailer = require("nodemailer");
const {
  errorResponse,
  successResponse,
  uniqueId,
  selectWithJoins,
  updateModel,
  requiredmessage,
  generateOTP,
  getBlobTempPublicUrl,
} = require("../../helper/index.js");
const md5 = require("md5");

// token se admin dhundo — same proven selectWithJoins jo login() me kaam kar raha hai
const findAdminByToken = async (token) => {
  if (!token) return null;

  const admin = await selectWithJoins(
    "admin",
    [],
    { token, delete: 0 },
    ["adminId", "name", "email", "mobileNumber", "profile", "otp"]
  );

  return admin.length > 0 ? admin[0] : null;
};

// ---- SMTP transporter ----
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "your-smtp-email@gmail.com",
    pass: process.env.SMTP_PASS || "your-smtp-app-password",
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Amaar Admin" <${process.env.SMTP_USER || "your-smtp-email@gmail.com"}>`,
    to: toEmail,
    subject: "Your OTP Code",
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2>OTP Verification</h2>
        <p>Your OTP code is:</p>
        <h1 style="letter-spacing:8px">${otp}</h1>
        <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};

// login
const login = async (req, res) => {
  try {
    const email = req.body.email || "";
    const password = req.body.password || "";

    if (!email || !password) {
      return requiredmessage(res, "Email and Password are required.");
    }

    const admin = await selectWithJoins(
      "admin",
      [],
      { email, password: md5(password), delete: 0 },
      ["adminId", "name", "email", "mobileNumber", "profile"]
    );

    if (admin.length === 0) {
      return requiredmessage(res, "Invalid Email or Password");
    }

    // uniqueId() se token generate karo (ye DB me check karke guarantee
    // deta hai ki token kisi aur admin ko already assign nahi hai)
    const token = await uniqueId();
    const otp = generateOTP();

    // token + otp dono admin table me save karo
    await updateModel(
      "admin",
      { token, otp, updated: new Date() },
      { adminId: admin[0].adminId, delete: 0 }
    );

    // send otp email
    try {
      await sendOtpEmail(admin[0].email, otp);
    } catch (mailErr) {
      console.log("OTP mail error:", mailErr);
      return errorResponse(res, "Failed to send OTP email", mailErr);
    }

    // adminId frontend ko nahi bhejna — sirf token + email
    const responseData = {
      token,
      email: admin[0].email,
      name: admin[0].name,
    };

    return successResponse(res, responseData, "Login Successfully. OTP sent to your email.");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// otpVerification -> ab token se admin identify hota hai, adminId body me nahi aata
const otpVerification = async (req, res) => {
  const token = req.body.token || "";
  const otp = req.body.otp || "";

  try {
    if (!token) {
      return requiredmessage(res, "Invalid or expired session. Please login again.");
    }

    const admin = await findAdminByToken(token);

    if (!admin) {
      return requiredmessage(res, "Invalid or expired session. Please login again.");
    }

    if (admin.otp !== otp) {
      return requiredmessage(res, "Otp is Wrong !");
    }

    // otp use ho gaya, clear kar do (token wahi rehne do, ye ab session token ban gaya)
    await updateModel(
      "admin",
      { otp: null, updated: new Date() },
      { adminId: admin.adminId, delete: 0 }
    );

    const responseData = {
      token,
      name: admin.name,
      email: admin.email,
      mobileNumber: admin.mobileNumber,
      profile: getBlobTempPublicUrl(admin.profile),
    };

    return successResponse(res, responseData, "Otp Verified");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// resend otp -> token se hi admin dhundo
const resendOtp = async (req, res) => {
  const token = req.body.token || "";

  try {
    if (!token) {
      return requiredmessage(res, "Invalid or expired session. Please login again.");
    }

    const admin = await findAdminByToken(token);

    if (!admin) {
      return requiredmessage(res, "Invalid or expired session. Please login again.");
    }

    const otp = generateOTP();
    await updateModel(
      "admin",
      { otp, updated: new Date() },
      { adminId: admin.adminId, delete: 0 }
    );
    await sendOtpEmail(admin.email, otp);

    return successResponse(res, {}, "OTP Resent Successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  login,
  otpVerification,
  resendOtp,
};