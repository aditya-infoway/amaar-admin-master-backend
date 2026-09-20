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




  // Lead details are read live from the lead now. The backend ignores these
  // fields; they are only allowed here until the frontend stops sending them.
  customerName: Joi.any().optional(),
  mobile: Joi.any().optional(),
  email: Joi.any().optional(),
  address: Joi.any().optional(),
  city: Joi.any().optional(),
  model: Joi.any().optional(),
  remark: Joi.any().optional(),


 

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