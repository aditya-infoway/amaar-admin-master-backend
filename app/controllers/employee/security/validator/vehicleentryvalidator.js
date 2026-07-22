const Joi = require("joi");

const createVehicleEntry = Joi.object().keys({
  entryDate: Joi.string().trim().required().messages({
    "string.empty": "Entry date is required",
  }),
  entryTime: Joi.string().trim().required().messages({
    "string.empty": "Entry time is required",
  }),
  vehicleType: Joi.string().trim().required().messages({
    "string.empty": "Vehicle type is required",
  }),
  vehicleNumber: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9-]{4,15}$/)
    .required()
    .messages({
      "string.empty": "Vehicle number is required",
      "string.pattern.base": "Enter a valid vehicle number",
    }),
  vehicleBrand: Joi.string().trim().allow("", null),
  driverName: Joi.string().trim().required().messages({
    "string.empty": "Driver name is required",
  }),
  mobileNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.empty": "Mobile number is required",
      "string.pattern.base": "Mobile number must be 10 digits",
    }),
  company: Joi.string().trim().allow("", null),
  purpose: Joi.string().trim().required().messages({
    "string.empty": "Purpose is required",
  }),
  employeeToMeet: Joi.string().trim().allow("", null),
  gateNumber: Joi.string().trim().allow("", null),
  vehicleCondition: Joi.string().trim().required().messages({
    "string.empty": "Vehicle condition is required",
  }),
  status: Joi.string().valid("IN", "OUT").default("IN"),
});

const updateVehicleEntry = createVehicleEntry.keys({
  vehicleEntryId: Joi.number().required().messages({
    "number.base": "Vehicle entry id is required",
  }),
  // ===== YE 4 LINES ADD KI HAIN =====
  // Edit mode me agar photo change nahi ki, to purani image ka URL/string
  // formData ke through body me text field ban ke aata hai (file nahi).
  // Controller isko use hi nahi karta (sirf req.files check karta hai),
  // isliye Joi ko bas iska hona allow karna hai, reject nahi karna.
  driverPhoto: Joi.any().optional(),
  rcPhoto: Joi.any().optional(),
  vehiclePhotoFront: Joi.any().optional(),
  vehiclePhotoBack: Joi.any().optional(),
});

const exitVehicleEntry = Joi.object().keys({
  vehicleEntryId: Joi.number().required().messages({
    "number.base": "Vehicle entry id is required",
  }),
  exitTime: Joi.string().trim().required().messages({
    "string.empty": "Exit time is required",
  }),
  exitVehicleCondition: Joi.string().trim().required().messages({
    "string.empty": "Exit vehicle condition is required",
  }),
  // FormData se string "true"/"false" aata hai, Joi.boolean() usko convert kar leta hai
  conditionChangedAtExit: Joi.boolean().default(false),
});

const deleteVehicleEntry = Joi.object().keys({
  vehicleEntryId: Joi.number().required().messages({
    "number.base": "Vehicle entry id is required",
  }),
});

module.exports = {
  createVehicleEntry,
  updateVehicleEntry,
  exitVehicleEntry,
  deleteVehicleEntry,
};