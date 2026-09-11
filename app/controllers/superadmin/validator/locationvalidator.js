const Joi = require("joi");

const createLocation = Joi.object().keys({
  locationCode: Joi.string().trim().required().messages({
    "string.empty": "Location code is required",
  }),
  locationName: Joi.string().trim().required().messages({
    "string.empty": "Location name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const updateLocation = Joi.object().keys({
  locationId: Joi.number().required().messages({
    "number.base": "Location id is required",
  }),
  locationCode: Joi.string().trim().required().messages({
    "string.empty": "Location code is required",
  }),
  locationName: Joi.string().trim().required().messages({
    "string.empty": "Location name is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be either active or inactive",
    "string.empty": "Status is required",
  }),
});

const deleteLocation = Joi.object().keys({
  locationId: Joi.number().required().messages({
    "number.base": "Location id is required",
  }),
});

module.exports = {
  createLocation,
  updateLocation,
  deleteLocation,
};