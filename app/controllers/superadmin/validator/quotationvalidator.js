const Joi = require("joi");

// ============================================================
// QUOTATION CREATE / UPDATE VALIDATION
// ============================================================

const validateQuotation = Joi.object().keys({
  financialYearId: Joi.number()
    .required()
    .messages({
      "any.required": "Financial Year Id is required",
      "number.base": "Financial Year Id must be a number",
    }),

 qNo: Joi.string().optional().allow("", null),

  leadId: Joi.number()
    .required()
    .messages({
      "any.required": "Lead is required",
      "number.base": "Lead must be a number",
    }),

  customerName: Joi.string()
    .required()
    .messages({
      "any.required": "Customer name is required",
      "string.empty": "Customer name is required",
    }),

  mobile: Joi.string()
    .required()
    .messages({
      "any.required": "Mobile is required",
      "string.empty": "Mobile is required",
    }),

  email: Joi.string()
    .email()
    .allow("", null),

  address: Joi.string()
    .allow("", null),

  city: Joi.string()
    .allow("", null),

  model: Joi.string()
    .allow("", null),

  remark: Joi.string()
    .allow("", null),

  // ==========================================================
  // VEHICLE TYPE
  // ==========================================================

  vehicleType: Joi.string()
    .valid("tipper", "trailer")
    .required()
    .messages({
      "any.required": "Vehicle type is required",
      "any.only": "Vehicle type must be either tipper or trailer",
    }),

  // ==========================================================
  // TECHNICAL SPECIFICATIONS
  // ==========================================================

  trailer: Joi.number()
    .required()
    .messages({
      "any.required": "Trailer Detail is required",
      "number.base": "Trailer Detail must be a number",
    }),

  // Chassis required only for trailer
  chassis: Joi.when("vehicleType", {
    is: "trailer",
    then: Joi.number()
      .required()
      .messages({
        "any.required": "Main Chassis is required for trailer",
        "number.base": "Main Chassis must be a number",
      }),
    otherwise: Joi.number()
      .allow(null, ""),
  }),

  body: Joi.number()
    .required()
    .messages({
      "any.required": "Body Details is required",
      "number.base": "Body Details must be a number",
    }),

  hydraulic: Joi.number()
    .required()
    .messages({
      "any.required": "Hyd Kit is required",
      "number.base": "Hyd Kit must be a number",
    }),

  axle: Joi.number()
    .required()
    .messages({
      "any.required": "Axle is required",
      "number.base": "Axle must be a number",
    }),

  suspension: Joi.number()
    .required()
    .messages({
      "any.required": "Suspension is required",
      "number.base": "Suspension must be a number",
    }),

  tyre: Joi.number()
    .required()
    .messages({
      "any.required": "Tyre is required",
      "number.base": "Tyre must be a number",
    }),

  rim: Joi.number()
    .required()
    .messages({
      "any.required": "Rim is required",
      "number.base": "Rim must be a number",
    }),

  kingPin: Joi.number()
    .required()
    .messages({
      "any.required": "King Pin is required",
      "number.base": "King Pin must be a number",
    }),

  landingLeg: Joi.number()
    .required()
    .messages({
      "any.required": "Landing Leg is required",
      "number.base": "Landing Leg must be a number",
    }),

  brakeSystem: Joi.number()
    .required()
    .messages({
      "any.required": "Brake System is required",
      "number.base": "Brake System must be a number",
    }),

  mudguard: Joi.number()
    .required()
    .messages({
      "any.required": "Mudguard is required",
      "number.base": "Mudguard must be a number",
    }),

  color: Joi.number()
    .required()
    .messages({
      "any.required": "Paint is required",
      "number.base": "Paint must be a number",
    }),

  electricalTapes: Joi.number()
    .required()
    .messages({
      "any.required": "Electrical & Reflective Tapes is required",
      "number.base": "Electrical & Reflective Tapes must be a number",
    }),

  supdRupd: Joi.number()
    .required()
    .messages({
      "any.required": "SUPD & RUPD is required",
      "number.base": "SUPD & RUPD must be a number",
    }),

  box: Joi.number()
    .required()
    .messages({
      "any.required": "Tool Box is required",
      "number.base": "Tool Box must be a number",
    }),

  spareWheelCarrier: Joi.number()
    .required()
    .messages({
      "any.required": "Spare Wheel Carrier is required",
      "number.base": "Spare Wheel Carrier must be a number",
    }),

  // ==========================================================
  // WARRANTY
  // ==========================================================

  warranty: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.object()
    )
    .allow("", null),

// ==========================================================
// DISCOUNT
// ==========================================================

discountType: Joi.string()
  .valid("amount", "percentage")
  .default("amount")
  .messages({
    "any.only": "Invalid discount type",
  }),

discountValue: Joi.when("discountType", {
  is: "percentage",
  then: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      "number.base": "Discount value must be a number",
      "number.min": "Discount value cannot be negative",
      "number.max": "Discount percentage cannot exceed 100",
    }),

  otherwise: Joi.number()
    .min(0)
    .default(0)
    .messages({
      "number.base": "Discount value must be a number",
      "number.min": "Discount value cannot be negative",
    }),
}),

  position: Joi.string()
    .allow("", null),

  createdBy: Joi.alternatives()
    .try(
      Joi.number(),
      Joi.string()
    )
    .allow(null, ""),

      createdType: Joi.string()
    .allow(null, ""),
});

module.exports = {
  validateQuotation,
};