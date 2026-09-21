const Joi = require("joi");

const departmentValues = ["sale", "production", "security","hrms","canteen"];

const createEmployee = Joi.object().keys({
  department: Joi.string().valid(...departmentValues).required().messages({
    "any.only": "Please select a valid department",
    "string.empty": "Department is required",
  }),
  branch: Joi.string().trim().required().messages({
    "string.empty": "Branch is required",
  }),
  roleId: Joi.number().required().messages({
    "number.base": "Please select a role",
    "any.required": "Please select a role",
  }),
    accountId: Joi.number().allow(null, "").messages({
    "number.base": "Invalid account selected",
  }),
  employeeName: Joi.string().trim().required().messages({
    "string.empty": "Employee name is required",
  }),
  mobileNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
    "string.empty": "Mobile number is required",
    "string.pattern.base": "Mobile number must be 10 digits",
  }),
  alternateNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).allow("", null).messages({
    "string.pattern.base": "Alternate number must be 10 digits",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email",
  }),
  password: Joi.string().trim().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),
  createdBy: Joi.number().required().messages({
    "number.base": "createdBy is required",
    "any.required": "createdBy is required",
  }),
  createdType: Joi.string().trim().required().messages({
    "string.empty": "createdType is required",
  }),
});

const updateEmployee = Joi.object().keys({
  employeeId: Joi.number().required().messages({
    "number.base": "Employee id is required",
  }),
  department: Joi.string().valid(...departmentValues).required().messages({
    "any.only": "Please select a valid department",
    "string.empty": "Department is required",
  }),
  branch: Joi.string().trim().required().messages({
    "string.empty": "Branch is required",
  }),
  roleId: Joi.number().required().messages({
    "number.base": "Please select a role",
    "any.required": "Please select a role",
  }),
  employeeName: Joi.string().trim().required().messages({
    "string.empty": "Employee name is required",
  }),
  mobileNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
    "string.empty": "Mobile number is required",
    "string.pattern.base": "Mobile number must be 10 digits",
  }),
  alternateNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).allow("", null).messages({
    "string.pattern.base": "Alternate number must be 10 digits",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email",
  }),
  // update me password optional — blank bhejo to purana password rahega
  password: Joi.string().trim().min(6).allow("", null),
});

const deleteEmployee = Joi.object().keys({
  employeeId: Joi.number().required().messages({
    "number.base": "Employee id is required",
  }),
});

const registerEmployee = Joi.object().keys({

  employeeId: Joi.number().required().messages({
    "number.base": "Please select an employee",
    "any.required": "Please select an employee",
  }),
 financialYearId: Joi.number().required().messages({
    "number.base": "Financial year is invalid",
    "any.required": "Financial year is required",
  }),
  firstName: Joi.string().trim().required().messages({
    "string.empty": "First name is required",
  }),

  lastName: Joi.string().trim().required().messages({
    "string.empty": "Last name is required",
  }),

  middleName: Joi.string().trim().allow("", null),

  dateOfBirth: Joi.string().trim().required().messages({
    "string.empty": "Date of birth is required",
  }),

  gender: Joi.string().trim().required().messages({
    "string.empty": "Gender is required",
  }),

  maritalStatus: Joi.string().trim().required().messages({
    "string.empty": "Marital status is required",
  }),

  bloodGroup: Joi.string().trim().allow("", null),

  personalMobileNo: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.empty": "Personal mobile number is required",
      "string.pattern.base": "Personal mobile number must be 10 digits",
    }),

  personalEmail: Joi.string()
    .trim()
    .email()
    .allow("", null)
    .messages({
      "string.email": "Enter a valid email",
    }),

  aadharNumber: Joi.string().trim().allow("", null),

  drivingLicenceNumber: Joi.string().trim().allow("", null),

  panNumber: Joi.string().trim().allow("", null),

  voterIdNumber: Joi.string().trim().allow("", null),

  address: Joi.string().trim().required().messages({
    "string.empty": "Address is required",
  }),

  country: Joi.string().trim().required().messages({
    "string.empty": "Country is required",
  }),

  state: Joi.string().trim().required().messages({
    "string.empty": "State is required",
  }),

  city: Joi.string().trim().required().messages({
    "string.empty": "District/City is required",
  }),

  pincode: Joi.string().trim().required().messages({
    "string.empty": "Pincode is required",
  }),

  sameAsPermanentAddress: Joi.alternatives()
    .try(Joi.boolean(), Joi.string())
    .required(),

  permanentAddress: Joi.string().trim().allow("", null),

  permanentCountry: Joi.string().trim().allow("", null),

  permanentState: Joi.string().trim().allow("", null),

  permanentCity: Joi.string().trim().allow("", null),

  permanentPincode: Joi.string().trim().allow("", null),

  joiningDate: Joi.string().trim().required().messages({
    "string.empty": "Joining date is required",
  }),

  employeeType: Joi.string().trim().required().messages({
    "string.empty": "Employee type is required",
  }),

  designation: Joi.string().trim().required().messages({
    "string.empty": "Designation is required",
  }),

  branchLocation: Joi.string().trim().allow("", null),

  employeeStatus: Joi.string().trim().required().messages({
    "string.empty": "Employee status is required",
  }),

  noticePeriod: Joi.string().trim().allow("", null),
   workingDays: Joi.string().trim().required().messages({
    "string.empty": "Working days are required",
  }),

  weeklyOff: Joi.string().trim().required().messages({
    "string.empty": "Weekly off is required",
  }),

  workingHoursFrom: Joi.string().trim().required().messages({
    "string.empty": "Working hours (from) is required",
  }),

  workingHoursTo: Joi.string().trim().required().messages({
    "string.empty": "Working hours (to) is required",
  }),

  workingShift: Joi.string().trim().required().messages({
    "string.empty": "Working shift is required",
  }),
});


// ================= EXPORT =================

module.exports = {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  registerEmployee,
};