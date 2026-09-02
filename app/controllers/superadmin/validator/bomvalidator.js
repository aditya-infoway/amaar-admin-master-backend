const Joi = require("joi");

// ---------------------------------------------------------------------------
// Ek item node ka shape. `refItemId` hi authoritative reference hai
// (itemmaster.itemId) — yehi DB me store hoga. `itemCode` sirf error
// messages/logging ke liye bhejte raho (store nahi hoga).
// children recursive hai (Joi.link se self-reference).
// ---------------------------------------------------------------------------
const itemNode = Joi.object({
  id: Joi.string().required(),                 // frontend tempId
  refItemId: Joi.number().required().messages({
    "number.base": "Every BOM row must reference a valid Item Master item",
    "any.required": "Every BOM row must reference a valid Item Master item",
  }),
  itemCode: Joi.string().trim().allow("", null), // display/error-message only
  itemName: Joi.string().trim().allow("", null),

  quantity: Joi.string().trim().allow("", null),
  unit: Joi.string().trim().allow("", null),

  serialNo: Joi.string().trim().allow("", null),
  asslyQty: Joi.string().trim().allow("", null),
  ldDay: Joi.string().trim().allow("", null),
  psNo: Joi.string().trim().allow("", null),
  rejPct: Joi.string().trim().allow("", null),
  pkgNo: Joi.string().trim().allow("", null),
  mfgCd: Joi.string().trim().allow("", null),
  modDate: Joi.string().trim().allow("", null),
  person: Joi.string().trim().allow("", null),
  status: Joi.string().trim().allow("", null),
  dtlNo: Joi.string().trim().allow("", null),

  shapeDim: Joi.string().trim().allow("", null),
  finQtty: Joi.string().trim().allow("", null),
  shape: Joi.string().trim().allow("", null),
 thickness: Joi.string().trim().allow("", null),
length: Joi.string().trim().allow("", null),
width: Joi.string().trim().allow("", null),
weight: Joi.string().trim().allow("", null),

  children: Joi.array().items(Joi.link("#itemNode")).default([]),
}).id("itemNode");

const createBom = Joi.object().keys({
  bomName: Joi.string().trim().required().messages({
    "string.empty": "BOM Name is required",
  }),
  bomCode: Joi.string().trim().required().messages({
    "string.empty": "BOM Code is required",
  }),
  status: Joi.string().trim().valid("active", "inactive").default("active"),
  items: Joi.array().items(itemNode).min(1).required().messages({
    "array.min": "Please add at least one item to BOM",
  }),
});

const updateBom = createBom.keys({
  bomId: Joi.number().required().messages({
    "number.base": "BOM id is required",
  }),
});

const deleteBom = Joi.object().keys({
  bomId: Joi.number().required().messages({
    "number.base": "BOM id is required",
  }),
});

module.exports = { createBom, updateBom, deleteBom };