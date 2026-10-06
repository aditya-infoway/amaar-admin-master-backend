const Joi = require("joi");

const baseSchema = {
  groupName: Joi.string().trim().required().messages({
    "string.empty": "Group Name is required",
    "any.required": "Group Name is required",
  }),
  groupId: Joi.number().required().messages({
    "any.required": "Group is required",
    "number.base": "Group is required",
  }),
  status: Joi.string().valid("active", "inactive").default("active"),
};

const createAccountGroup = Joi.object().keys(baseSchema);

const updateAccountGroup = Joi.object().keys({
  ...baseSchema,
  accountGroupId: Joi.number().required().messages({
    "any.required": "Account group id is required",
  }),
});

const deleteAccountGroup = Joi.object().keys({
  accountGroupId: Joi.number().required().messages({
    "any.required": "Account group id is required",
  }),
});

module.exports = { createAccountGroup, updateAccountGroup, deleteAccountGroup };