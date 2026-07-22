const Joi = require("joi");

const createVisitorEntry = Joi.object().keys({
  visitorId: Joi.string().trim().allow("", null),
  fullName: Joi.string().trim().required().messages({
    "string.empty": "Full name is required",
  }),
  gender: Joi.string().trim().required().messages({
    "string.empty": "Gender is required",
  }),
  mobileNumber: Joi.string().trim().required().messages({
    "string.empty": "Mobile number is required",
  }),
  email: Joi.string().trim().allow("", null),
  company: Joi.string().trim().allow("", null),
  address: Joi.string().trim().allow("", null),
  country: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  pincode: Joi.string().trim().allow("", null),

  idProofType: Joi.string().trim().required().messages({
    "string.empty": "ID proof type is required",
  }),
  idProofNumber: Joi.string().trim().required().messages({
    "string.empty": "ID proof number is required",
  }),

  visitDate: Joi.string().trim().required().messages({
    "string.empty": "Visit date is required",
  }),
  entryTime: Joi.string().trim().required().messages({
    "string.empty": "Entry time is required",
  }),
  exitTime: Joi.string().trim().allow("", null),
  purpose: Joi.string().trim().required().messages({
    "string.empty": "Purpose is required",
  }),
  department: Joi.string().trim().allow("", null),
  personToMeet: Joi.string().trim().required().messages({
    "string.empty": "Person to meet is required",
  }),
  employeeId: Joi.string().trim().allow("", null),
  duration: Joi.string().trim().allow("", null),

  numberOfPersons: Joi.string().trim().allow("", null),
  adultCount: Joi.string().trim().allow("", null),
  childCount: Joi.string().trim().allow("", null),
  accompanyingPerson: Joi.string().trim().allow("", null),
  vehicleAvailable: Joi.boolean().default(false),
  vehicleNumber: Joi.string().trim().allow("", null),
  previousVisit: Joi.boolean().default(false),
  frequentVisitor: Joi.boolean().default(false),

  gate: Joi.string().trim().allow("", null),
  securityGuard: Joi.string().trim().allow("", null),
  mobileCount: Joi.string().trim().allow("", null),
  allowedAreas: Joi.string().trim().allow("", null),
  restrictedAreas: Joi.string().trim().allow("", null),
  otherItems: Joi.string().trim().allow("", null),
  bagChecked: Joi.boolean().default(false),
  laptop: Joi.boolean().default(false),
  camera: Joi.boolean().default(false),

  status: Joi.string().valid("HOLD", "IN", "OUT").default("HOLD"),

  idFrontPhoto: Joi.any().optional(),
  idBackPhoto: Joi.any().optional(),
  visitorPhoto: Joi.any().optional(),
});

// ---- Edit ke liye (visitorId/status yaha nahi bhejte, wo fix rehte hai) ----
const updateVisitorEntry = Joi.object().keys({
  fullName: Joi.string().trim().required().messages({
    "string.empty": "Full name is required",
  }),
  gender: Joi.string().trim().required().messages({
    "string.empty": "Gender is required",
  }),
  mobileNumber: Joi.string().trim().required().messages({
    "string.empty": "Mobile number is required",
  }),
  email: Joi.string().trim().allow("", null),
  company: Joi.string().trim().allow("", null),
  address: Joi.string().trim().allow("", null),
  country: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  pincode: Joi.string().trim().allow("", null),

  idProofType: Joi.string().trim().required().messages({
    "string.empty": "ID proof type is required",
  }),
  idProofNumber: Joi.string().trim().required().messages({
    "string.empty": "ID proof number is required",
  }),

  visitDate: Joi.string().trim().required().messages({
    "string.empty": "Visit date is required",
  }),
  entryTime: Joi.string().trim().required().messages({
    "string.empty": "Entry time is required",
  }),
  exitTime: Joi.string().trim().allow("", null),
  purpose: Joi.string().trim().required().messages({
    "string.empty": "Purpose is required",
  }),
  department: Joi.string().trim().allow("", null),
  personToMeet: Joi.string().trim().required().messages({
    "string.empty": "Person to meet is required",
  }),
  employeeId: Joi.string().trim().allow("", null),
  duration: Joi.string().trim().allow("", null),

  numberOfPersons: Joi.string().trim().allow("", null),
  adultCount: Joi.string().trim().allow("", null),
  childCount: Joi.string().trim().allow("", null),
  accompanyingPerson: Joi.string().trim().allow("", null),
  vehicleAvailable: Joi.boolean().default(false),
  vehicleNumber: Joi.string().trim().allow("", null),
  previousVisit: Joi.boolean().default(false),
  frequentVisitor: Joi.boolean().default(false),

  gate: Joi.string().trim().allow("", null),
  securityGuard: Joi.string().trim().allow("", null),
  mobileCount: Joi.string().trim().allow("", null),
  allowedAreas: Joi.string().trim().allow("", null),
  restrictedAreas: Joi.string().trim().allow("", null),
  otherItems: Joi.string().trim().allow("", null),
  bagChecked: Joi.boolean().default(false),
  laptop: Joi.boolean().default(false),
  camera: Joi.boolean().default(false),

  idFrontPhoto: Joi.any().optional(),
  idBackPhoto: Joi.any().optional(),
  visitorPhoto: Joi.any().optional(),
});

const exitVisitorEntry = Joi.object().keys({
  visitorEntryId: Joi.number().required().messages({
    "number.base": "Visitor entry id is required",
  }),
  exitTime: Joi.string().trim().required().messages({
    "string.empty": "Exit time is required",
  }),
  exitGate: Joi.string().trim().required().messages({
    "string.empty": "Exit gate is required",
  }),
  badgeReturned: Joi.boolean().default(false),
  exitRemarks: Joi.string().trim().allow("", null),
});

const deleteVisitorEntry = Joi.object().keys({
  visitorEntryId: Joi.number().required().messages({
    "number.base": "Visitor entry id is required",
  }),
});

module.exports = {
  createVisitorEntry,
  updateVisitorEntry,
  exitVisitorEntry,
  deleteVisitorEntry,
};