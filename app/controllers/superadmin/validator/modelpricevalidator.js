const Joi = require("joi");

// One line / component
const componentNode = Joi.object({
    // frontend temp id (optional)
    id: Joi.string().allow("", null),

    // createmaster.createMasterId
    itemId: Joi.number().integer().positive().required().messages({
        "any.required": "Every row must reference a Create Master item",
        "number.base": "Every row must reference a Create Master item",
    }),

    type: Joi.string()
        .trim()
        .valid("BOM", "Manual", "Quotation")
        .required()
        .messages({
            "any.only": "Type must be BOM, Manual or Quotation",
            "any.required": "Type is required",
        }),

    // only required when type = BOM (checked in controller too)
    groupId: Joi.number().integer().positive().allow(null),
    subGroupId: Joi.number().integer().positive().allow(null),

    weight: Joi.alternatives()
        .try(Joi.string().trim().allow("", null), Joi.number())
        .allow(null),
    rate: Joi.alternatives()
        .try(Joi.string().trim().allow("", null), Joi.number())
        .allow(null),
    value: Joi.alternatives()
        .try(Joi.string().trim().allow("", null), Joi.number())
        .allow(null),
}).unknown(true);

const createModelPrice = Joi.object().keys({
    finishedGoodsItemId: Joi.number().integer().positive().required().messages({
        "any.required": "Finished Goods is required",
        "number.base": "Finished Goods is required",
    }),
    financialYearId: Joi.number().integer().positive().required().messages({
        "any.required": "Financial Year not found in session.",
    }),
    modelName: Joi.string().trim().allow("", null),
    referenceModelPriceId: Joi.number().integer().positive().allow(null),
    effectiveDate: Joi.string().trim().allow("", null),
    currentDate: Joi.date().required().messages({
        "any.required": "Current Date is required",
    }),
    status: Joi.string().trim().valid("active", "inactive").default("active"),
    items: Joi.array().items(componentNode).min(1).required().messages({
        "array.min": "Please add at least one component",
    }),
});

const updateModelPrice = createModelPrice.keys({
    modelPriceId: Joi.number().integer().positive().required().messages({
        "any.required": "modelPriceId is required",
        "number.base": "modelPriceId is required",
    }),
    financialYearId: Joi.number().integer().positive().allow(null),
});

const deleteModelPrice = Joi.object().keys({
    modelPriceId: Joi.number().integer().positive().required().messages({
        "any.required": "modelPriceId is required",
        "number.base": "modelPriceId is required",
    }),
});

module.exports = {
    createModelPrice,
    updateModelPrice,
    deleteModelPrice,
};
