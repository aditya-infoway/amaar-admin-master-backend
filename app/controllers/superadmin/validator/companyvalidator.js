const Joi = require("joi");

const companyLogin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string()
    .valid("Super Admin", "Employee", "Branch", "Warehouse")
    .required()
    .messages({
      "any.only": "Invalid role selected",
      "any.required": "Role is required",
    }),
      latitude: Joi.number().optional(),
   longitude: Joi.number().optional(),
});



module.exports = {
  companyLogin,
};
