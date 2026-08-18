const Joi = require("joi");

// ---------------- CREATE ----------------

const createCreateMaster = Joi.object().keys({
  type: Joi.string().trim().required().messages({
    "string.empty": "Type is required",
    "any.required": "Type is required",
  }),

  description: Joi.string().trim().required().messages({
    "string.empty": "Description is required",
    "any.required": "Description is required",
  }),

  actualItem: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().required().messages({
          "string.empty": "Actual item id is required",
          "any.required": "Actual item id is required",
        }),

        name: Joi.string().trim().required().messages({
          "string.empty": "Actual item name is required",
          "any.required": "Actual item name is required",
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Actual item must be an array",
      "array.min": "At least one actual item is required",
      "any.required": "Actual item is required",
    }),

  exShowroom: Joi.number().required().messages({
    "number.base": "Ex-Showroom must be a valid number",
    "any.required": "Ex-Showroom is required",
  }),

  effectiveDate: Joi.string()
    .trim()

    .required()
    .messages({
      "string.empty": "Effective date is required",

      "any.required": "Effective date is required",
    }),

  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
    "any.required": "Status is required",
  }),
});

// ---------------- UPDATE ----------------

const updateCreateMaster = Joi.object().keys({
  createMasterId: Joi.number().required().messages({
    "number.base": "Create master id is required",
    "any.required": "Create master id is required",
  }),

  type: Joi.string().trim().required().messages({
    "string.empty": "Type is required",
    "any.required": "Type is required",
  }),

  description: Joi.string().trim().required().messages({
    "string.empty": "Description is required",
    "any.required": "Description is required",
  }),

  actualItem: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().required().messages({
          "string.empty": "Actual item id is required",
          "any.required": "Actual item id is required",
        }),

        name: Joi.string().trim().required().messages({
          "string.empty": "Actual item name is required",
          "any.required": "Actual item name is required",
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Actual item must be an array",
      "array.min": "At least one actual item is required",
      "any.required": "Actual item is required",
    }),

  exShowroom: Joi.number().required().messages({
    "number.base": "Ex-Showroom must be a valid number",
    "any.required": "Ex-Showroom is required",
  }),

  effectiveDate: Joi.string()
    .trim()

    .required()
    .messages({
      "string.empty": "Effective date is required",

      "any.required": "Effective date is required",
    }),

  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
    "any.required": "Status is required",
  }),
});

// ---------------- DELETE ----------------

const deleteCreateMaster = Joi.object().keys({
  createMasterId: Joi.number().required().messages({
    "number.base": "Create master id is required",
    "any.required": "Create master id is required",
  }),
});

module.exports = {
  createCreateMaster,
  updateCreateMaster,
  deleteCreateMaster,
};
