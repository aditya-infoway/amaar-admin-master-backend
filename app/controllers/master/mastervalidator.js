const Joi = require("joi");

const login = Joi.object().keys({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

const otpVerification = Joi.object().keys({
  token: Joi.string().required(),
  otp: Joi.string().required(),
});

const resendOtp = Joi.object().keys({
  token: Joi.string().required(),
});

module.exports = {
  login,
  otpVerification,
  resendOtp,
};