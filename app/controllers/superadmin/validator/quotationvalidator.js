const Joi = require("joi");

// ============================================================
// QUOTATION CREATE / UPDATE VALIDATION
// ============================================================

const validateQuotation = Joi.object().keys({
  financialYearId: Joi.number().required().messages({
    "number.base": "Financial Year Id is required",
    "any.required": "Financial Year Id is required",
  }),

  qNo: Joi.string().trim().allow("", null),

  leadId: Joi.number().required().messages({
    "number.base": "Please select a lead",
    "any.required": "Please select a lead",
  }),

  customerName: Joi.string().trim().required().messages({
    "string.empty": "Customer name is required",
  }),

  mobile: Joi.string().trim().required().messages({
    "string.empty": "Mobile is required",
  }),

  email: Joi.string().trim().email().allow("", null).messages({
    "string.email": "Enter a valid email",
  }),

  address: Joi.string().trim().allow("", null),

  city: Joi.string().trim().allow("", null),

  model: Joi.string().trim().allow("", null),

  remark: Joi.string().trim().allow("", null),

  // ==========================================================
  // VEHICLE TYPE
  // ==========================================================

  vehicleType: Joi.string().valid("tipper", "trailer").required().messages({
    "any.only": "Vehicle type must be either tipper or trailer",
    "string.empty": "Vehicle type is required",
  }),

  // ==========================================================
  // TECHNICAL SPECIFICATIONS
  // Fields required for BOTH tipper and trailer
  // ==========================================================

  trailer: Joi.number().required().messages({
    "number.base": "Please select trailer/tipper detail",
    "any.required": "Please select trailer/tipper detail",
  }),

  chassis: Joi.number().required().messages({
    "number.base": "Please select main chassis",
    "any.required": "Please select main chassis",
  }),

  body: Joi.number().required().messages({
    "number.base": "Please select body details",
    "any.required": "Please select body details",
  }),

  hydraulic: Joi.number().required().messages({
    "number.base": "Please select hydraulic kit",
    "any.required": "Please select hydraulic kit",
  }),

  kingPin: Joi.number().required().messages({
    "number.base": "Please select king pin",
    "any.required": "Please select king pin",
  }),

  mudguard: Joi.number().required().messages({
    "number.base": "Please select mudguard",
    "any.required": "Please select mudguard",
  }),

  color: Joi.number().required().messages({
    "number.base": "Please select paint",
    "any.required": "Please select paint",
  }),

  supdRupd: Joi.number().required().messages({
    "number.base": "Please select SUPD & RUPD",
    "any.required": "Please select SUPD & RUPD",
  }),

  box: Joi.number().required().messages({
    "number.base": "Please select tool box",
    "any.required": "Please select tool box",
  }),

  // ==========================================================
  // Fields required ONLY for trailer (hidden/optional for tipper)
  // Controller checks these against vehicleType before saving.
  // ==========================================================

  axle: Joi.number().allow(null, ""),
  suspension: Joi.number().allow(null, ""),
  tyre: Joi.number().allow(null, ""),
  rim: Joi.number().allow(null, ""),
  landingLeg: Joi.number().allow(null, ""),
  brakeSystem: Joi.number().allow(null, ""),
  electricalTapes: Joi.number().allow(null, ""),
  spareWheelCarrier: Joi.number().allow(null, ""),

  // ==========================================================
  // WARRANTY
  // ==========================================================

  warranty: Joi.alternatives().try(Joi.string(), Joi.object()).allow("", null),

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  discountType: Joi.string()
    .valid("amount", "percentage")
    .default("amount")
    .messages({
      "any.only": "Invalid discount type",
    }),

  discountValue: Joi.number().min(0).default(0).messages({
    "number.base": "Discount value must be a number",
    "number.min": "Discount value cannot be negative",
  }),

  position: Joi.string().trim().allow("", null),

  createdBy: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null, ""),

  createdType: Joi.string().allow(null, ""),
});

module.exports = {
  validateQuotation,
};