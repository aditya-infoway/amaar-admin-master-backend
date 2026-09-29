const Joi = require("joi");

const createQc = Joi.object().keys({
  financialYearId: Joi.number()
    .required()
    .messages({ "any.required": "financial Year Id is required" }),
  grrId: Joi.number()
    .required()
    .messages({ "any.required": "GRR is required" }),
  qcDate: Joi.string().allow("", null),
  remarks: Joi.string().allow("", null),
  createdBy: Joi.number().allow(null, ""),
  createdType: Joi.string().trim().allow(null, ""),
  items: Joi.array()
    .min(1)
    .items(
      Joi.object({
        grrItemId: Joi.number().required().messages({
          "any.required": "GRR item reference is required",
        }),
        itemName: Joi.string().allow("", null),
        verifyQty: Joi.number()
          .min(0)
          .required()
          .messages({ "any.required": "Verify Qty is required" }),
      }),
    )
    .required()
    .messages({ "array.min": "Please add at least one item." }),
});

module.exports = { createQc };
