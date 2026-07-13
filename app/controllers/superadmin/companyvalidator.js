const Joi = require("joi");

const companyLogin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  companyLogin,
};