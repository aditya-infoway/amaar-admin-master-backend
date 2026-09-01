const Joi = require("joi");

// ============================================================
// CREATE PRICING
// ============================================================

const createCreatePricing = Joi.object().keys({
  code: Joi.string().trim().required().messages({
    "string.empty": "Code is required",
    "any.required": "Code is required",
  }),

  description: Joi.string().trim().required().messages({
    "string.empty": "Description is required",
    "any.required": "Description is required",
  }),

  effectiveDate: Joi.string().trim().required().messages({
    "string.empty": "Effective date is required",
    "any.required": "Effective date is required",
  }),

  exShowroomPrice: Joi.number().min(0).required().messages({
    "number.base": "Ex-Showroom price must be a valid number",
    "number.min": "Ex-Showroom price cannot be negative",
    "any.required": "Ex-Showroom price is required",
  }),
});

// ============================================================
// UPDATE PRICING
// ============================================================

const updateCreatePricing = Joi.object().keys({
  createPricingId: Joi.number().required().messages({
    "number.base": "Create pricing id is required",
    "any.required": "Create pricing id is required",
  }),

  code: Joi.string().trim().required().messages({
    "string.empty": "Code is required",
    "any.required": "Code is required",
  }),

  description: Joi.string().trim().required().messages({
    "string.empty": "Description is required",
    "any.required": "Description is required",
  }),

  effectiveDate: Joi.string().trim().required().messages({
    "string.empty": "Effective date is required",
    "any.required": "Effective date is required",
  }),

  exShowroomPrice: Joi.number().min(0).required().messages({
    "number.base": "Ex-Showroom price must be a valid number",
    "number.min": "Ex-Showroom price cannot be negative",
    "any.required": "Ex-Showroom price is required",
  }),

  status: Joi.string()
    .valid("active", "inactive")
    .required()
    .messages({
      "any.only": "Status must be either active or inactive",
      "string.empty": "Status is required",
      "any.required": "Status is required",
    }),
});

// ============================================================
// DELETE PRICING
// ============================================================

const deleteCreatePricing = Joi.object().keys({
  createPricingId: Joi.number().required().messages({
    "number.base": "Create pricing id is required",
    "any.required": "Create pricing id is required",
  }),
});


// ============================================================
// BULK IMPORT PRICING
// ============================================================

const bulkImportCreatePricing = Joi.object().keys({
  items: Joi.array()
    .items(
      Joi.object().keys({
        // REQUIRED
        code: Joi.string().trim().required().messages({
          "string.empty": "Code is required",
          "any.required": "Code is required",
        }),

        description: Joi.string().trim().required().messages({
          "string.empty": "Description is required",
          "any.required": "Description is required",
        }),

        // OPTIONAL
        effectiveDate: Joi.alternatives()
          .try(Joi.string().trim(), Joi.date())
          .allow("", null),

        exShowroomPrice: Joi.alternatives()
          .try(Joi.number().min(0), Joi.string().trim())
          .allow("", null),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "No pricing records to import.",
      "any.required": "Items array is required.",
    }),
});

module.exports = {
  createCreatePricing,
  updateCreatePricing,
  deleteCreatePricing,
  bulkImportCreatePricing,
};

