const Joi = require("joi");

const baseSchema = {
  itemCode: Joi.string().trim().required().min(2).max(30).messages({
    "string.empty": "Item Code is required",
    "string.min": "Item Code must be at least 2 characters",
    "string.max": "Item Code must not exceed 30 characters",
  }),
  itemName: Joi.string().trim().required().max(150).messages({
    "string.empty": "Item Name is required",
    "string.max": "Item Name must not exceed 150 characters",
  }),
  shortName: Joi.string().trim().required().max(50).messages({
    "string.empty": "Short Name is required",
    "string.max": "Short Name must not exceed 50 characters",
  }),
  hsnCode: Joi.string().trim().required().pattern(/^\d{4,8}$/).messages({
    "string.empty": "HSN Code is required",
    "string.pattern.base": "HSN Code must be 4 to 8 digits",
  }),
  itemLocation: Joi.string().trim().allow("", null),

  itemCategoryId: Joi.number().required().messages({
    "any.required": "Item Category is required",
    "number.base": "Item Category is required",
  }),
  groupId: Joi.number().required().messages({
    "any.required": "Group is required",
    "number.base": "Group is required",
  }),
  unit: Joi.string().trim().required().messages({
    "string.empty": "Unit is required",
  }),
  taxSlab: Joi.string().trim().required().messages({
    "string.empty": "Tax Slab is required",
  }),

  stockMapping: Joi.boolean().default(false),
  minQty: Joi.when("stockMapping", {
    is: true,
    then: Joi.number().required().min(0).messages({
      "any.required": "Min Qty is required",
      "number.base": "Min Qty is required",
    }),
    otherwise: Joi.number().allow(null, ""),
  }),
  maxQty: Joi.when("stockMapping", {
    is: true,
    then: Joi.number().required().min(0).messages({
      "any.required": "Max Qty is required",
      "number.base": "Max Qty is required",
    }),
    otherwise: Joi.number().allow(null, ""),
  }),

  purchasePrice: Joi.number().required().min(0).messages({
    "any.required": "Purchase Price is required",
    "number.base": "Purchase Price is required",
  }),
  actualPurchasePrice: Joi.number().required().min(0).messages({
    "any.required": "Actual Purchase Price is required",
    "number.base": "Actual Purchase Price is required",
  }),
  salesPrice: Joi.number().required().min(0).messages({
    "any.required": "Sales Price is required",
    "number.base": "Sales Price is required",
  }),
  mrp: Joi.number().required().min(0).messages({
    "any.required": "MRP is required",
    "number.base": "MRP is required",
  }),

  barcodeType: Joi.string().valid("manual", "generate").required().messages({
    "any.only": "Barcode Type must be either manual or generate",
    "string.empty": "Barcode Type is required",
  }),
  barcode: Joi.when("barcodeType", {
    is: "manual",
    then: Joi.string().trim().allow("", null).max(30)
      .pattern(/^[A-Za-z0-9-]*$/)
      .messages({
        "string.max": "Barcode must not exceed 30 characters",
        "string.pattern.base": "Barcode can only contain letters, numbers, and hyphens",
      }),
    otherwise: Joi.string().trim().allow("", null),
  }),

  status: Joi.string().valid("active", "inactive").default("active"),
};

const createItemMaster = Joi.object().keys(baseSchema);

const updateItemMaster = Joi.object().keys({
  ...baseSchema,
  itemId: Joi.number().required().messages({
    "any.required": "Item id is required",
  }),
});

const deleteItemMaster = Joi.object().keys({
  itemId: Joi.number().required().messages({
    "any.required": "Item id is required",
  }),
});

const setItemBarcode = Joi.object().keys({
  itemId: Joi.number().required(),
  barcode: Joi.string().trim().allow("", null).max(30)
    .pattern(/^[A-Za-z0-9-]*$/)
    .messages({
      "string.max": "Barcode must not exceed 30 characters",
      "string.pattern.base": "Barcode can only contain letters, numbers, and hyphens",
    }),
});

const autoGenerateItemBarcode = Joi.object().keys({
  itemId: Joi.number().required(),
});

const bulkAutoGenerateBarcode = Joi.object().keys({
  itemIds: Joi.array().items(Joi.number()).min(1).required(),
});

module.exports = {
  createItemMaster, updateItemMaster, deleteItemMaster,
  setItemBarcode, autoGenerateItemBarcode, bulkAutoGenerateBarcode,
};