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
  source: Joi.string().trim().valid("child", "subbom").allow("", null),
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
 finishedGoodsItemId: Joi.number().integer().positive().required().messages({
    "any.required": "Finished Goods Item is required",
    "number.base": "Finished Goods Item is required",
  }),
  items: Joi.array().items(itemNode).min(1).required().messages({
    "array.min": "Please add at least one item to BOM",
  }),
});

const updateBom = createBom.keys({
  bomId: Joi.number().required().messages({
    "number.base": "BOM id is required",
  }),
   finishedGoodsItemId: Joi.number().integer().positive().required().messages({
    "any.required": "Finished Goods Item is required",
    "number.base": "Finished Goods Item is required",
  }),
});

const deleteBom = Joi.object().keys({
  bomId: Joi.number().required().messages({
    "number.base": "BOM id is required",
  }),
});
// ---------------------------------------------------------------------------
// BULK IMPORT (Excel)
// Yahan sirf structure/type check hota hai. Item Code / Item Name ka
// required check aur DB check controller me row-wise hota hai, taaki error
// me exact row (parent > child) dikhe.
// ---------------------------------------------------------------------------
const importComponent = Joi.object({
  parentCode: Joi.string().trim().allow("", null),
  parentName: Joi.string().trim().allow("", null),
  childCode: Joi.string().trim().allow("", null),
  childName: Joi.string().trim().allow("", null),
  serialNo: Joi.number().allow(null, ""),
  uom: Joi.string().trim().allow("", null),
  qty: Joi.number().min(0).allow(null, ""),
  length: Joi.number().min(0).allow(null, ""),
  width: Joi.number().min(0).allow(null, ""),
  thickness: Joi.number().min(0).allow(null, ""),
}).unknown(true);

const bulkImportBom = Joi.object().keys({
  boms: Joi.array()
    .items(
      Joi.object({
        bomCode: Joi.string().trim().required().messages({
          "string.empty": "BOM Code is required",
          "any.required": "BOM Code is required",
        }),
        bomName: Joi.string().trim().allow("", null),
        itemCode: Joi.string().trim().required().messages({
          "string.empty": "Root Item Code is required",
          "any.required": "Root Item Code is required",
        }),
        quantity: Joi.number().allow(null, ""),
        unit: Joi.string().trim().allow("", null),
        status: Joi.string().trim().allow("", null),
        components: Joi.array()
          .items(importComponent)
          .min(1)
          .required()
          .messages({
            "array.min": "Each BOM needs at least one component row",
          }),
      }).unknown(true),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "No BOM data found in the file",
    }),
});
module.exports = { createBom, updateBom, deleteBom,bulkImportBom  };