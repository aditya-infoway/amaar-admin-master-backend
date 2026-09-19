const crypto = require("crypto");
const { sendMail } = require("./mail.js");

const OTP_TTL_MS = 5 * 60 * 1000; // OTP valid for 5 min
const VERIFIED_TTL_MS = 15 * 60 * 1000; // verified email stays valid for 15 min
const RESEND_GAP_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const otpStore = new Map(); // key -> { otp, expiresAt, attempts, sentAt }
const verifiedStore = new Map(); // key -> expiresAt

const keyOf = (companyId, email) =>
  `${companyId}:${String(email).trim().toLowerCase()}`;

const sendEmailOtp = async ({ companyId, email, name, companyName }) => {
  const key = keyOf(companyId, email);
  const existing = otpStore.get(key);
  if (existing && Date.now() - existing.sentAt < RESEND_GAP_MS) {
    throw new Error("Please wait 30 seconds before requesting a new OTP.");
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  otpStore.set(key, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now(),
  });
  verifiedStore.delete(key);

  try {
    await sendMail({
      to: email,
      subject: `Your OTP to confirm your enquiry - ${companyName || ""}`,
      fromName: companyName || "Autobook",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <p>Hello ${name || ""},</p>
          <p>Your OTP to confirm your enquiry is:</p>
          <h1 style="letter-spacing:8px">${otp}</h1>
          <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
        </div>`,
    });
  } catch (e) {
    otpStore.delete(key);
    throw new Error("Failed to send OTP email. Please check the email address.");
  }
};

const verifyEmailOtp = ({ companyId, email, otp }) => {
  const key = keyOf(companyId, email);
  const rec = otpStore.get(key);

  if (!rec) return { ok: false, message: "OTP not found. Please request a new OTP." };
  if (Date.now() > rec.expiresAt) {
    otpStore.delete(key);
    return { ok: false, message: "OTP expired. Please request a new OTP." };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { ok: false, message: "Too many wrong attempts. Please request a new OTP." };
  }
  if (rec.otp !== String(otp).trim()) {
    rec.attempts += 1;
    return { ok: false, message: "Incorrect OTP." };
  }

  otpStore.delete(key);
  verifiedStore.set(key, Date.now() + VERIFIED_TTL_MS);
  return { ok: true };
};

const isEmailVerified = (companyId, email) => {
  const key = keyOf(companyId, email);
  const exp = verifiedStore.get(key);
  if (!exp) return false;
  if (Date.now() > exp) {
    verifiedStore.delete(key);
    return false;
  }
  return true;
};

const clearVerifiedEmail = (companyId, email) =>
  verifiedStore.delete(keyOf(companyId, email));

module.exports = { sendEmailOtp, verifyEmailOtp, isEmailVerified, clearVerifiedEmail };