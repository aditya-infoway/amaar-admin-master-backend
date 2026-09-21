const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "employeeId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    department: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "department"
    },
    branch: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "0",
      field: "branch"
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "roleId"
    },
     accountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "accountId"
    },
    employeeName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "employeeName"
    },
    mobileNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      field: "mobileNumber"
    },
    alternateNumber: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: "alternateNumber"
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "email"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password"
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "token"
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
      field: "status"
    },

    // ================= EMPLOYEE REGISTER (wizard) FIELDS =================
    // Business-facing employee code, e.g. EMP-000123 — generated server-side,
    // separate from the auto-increment employeeId primary key.
    financialYearId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  field: "financialYearId",
},
    employeeCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "employeeCode",
    },

    // Flag to know if the wizard (Identity/Address/Employee Details) has been
    // completed for this employee row — used to hide it from "Select Employee".
    isRegistered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "isRegistered",
    },

    // ---- Personal Details ----
    firstName: { type: DataTypes.STRING(150), allowNull: true, field: "firstName" },
    lastName: { type: DataTypes.STRING(150), allowNull: true, field: "lastName" },
    middleName: { type: DataTypes.STRING(150), allowNull: true, field: "middleName" },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true, field: "dateOfBirth" },
    gender: { type: DataTypes.STRING(30), allowNull: true, field: "gender" },
    maritalStatus: { type: DataTypes.STRING(30), allowNull: true, field: "maritalStatus" },
    bloodGroup: { type: DataTypes.STRING(10), allowNull: true, field: "bloodGroup" },
    personalMobileNo: { type: DataTypes.STRING(30), allowNull: true, field: "personalMobileNo" },
    personalEmail: { type: DataTypes.STRING(200), allowNull: true, field: "personalEmail" },

    // ---- Identity & KYC ----
    employeePhoto: {
  type: DataTypes.TEXT,
  allowNull: true,
  field: "employeePhoto",
},
    aadharNumber: { type: DataTypes.STRING(50), allowNull: true, field: "aadharNumber" },
    aadharCardUpload: { type: DataTypes.TEXT, allowNull: true, field: "aadharCardUpload" },
    drivingLicenceNumber: { type: DataTypes.STRING(50), allowNull: true, field: "drivingLicenceNumber" },
    drivingLicenceUpload: { type: DataTypes.TEXT, allowNull: true, field: "drivingLicenceUpload" },
    panNumber: { type: DataTypes.STRING(50), allowNull: true, field: "panNumber" },
    panUpload: { type: DataTypes.TEXT, allowNull: true, field: "panUpload" },
    voterIdNumber: { type: DataTypes.STRING(50), allowNull: true, field: "voterIdNumber" },
    voterIdUpload: { type: DataTypes.TEXT, allowNull: true, field: "voterIdUpload" },

    // ---- Current Address ----
    address: { type: DataTypes.TEXT, allowNull: true, field: "address" },
    country: { type: DataTypes.STRING(150), allowNull: true, field: "country" },
    state: { type: DataTypes.STRING(150), allowNull: true, field: "state" },
    city: { type: DataTypes.STRING(150), allowNull: true, field: "city" },
    pincode: { type: DataTypes.STRING(20), allowNull: true, field: "pincode" },

    // ---- Permanent Address ----
    sameAsPermanentAddress: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true, field: "sameAsPermanentAddress" },
    permanentAddress: { type: DataTypes.TEXT, allowNull: true, field: "permanentAddress" },
    permanentCountry: { type: DataTypes.STRING(150), allowNull: true, field: "permanentCountry" },
    permanentState: { type: DataTypes.STRING(150), allowNull: true, field: "permanentState" },
    permanentCity: { type: DataTypes.STRING(150), allowNull: true, field: "permanentCity" },
    permanentPincode: { type: DataTypes.STRING(20), allowNull: true, field: "permanentPincode" },

    // ---- Employee Details ----
    joiningDate: { type: DataTypes.DATEONLY, allowNull: true, field: "joiningDate" },
    employeeType: { type: DataTypes.STRING(30), allowNull: true, field: "employeeType" },
    designation: { type: DataTypes.STRING(150), allowNull: true, field: "designation" },
    branchLocation: { type: DataTypes.STRING(150), allowNull: true, field: "branchLocation" },
    employeeStatus: { type: DataTypes.STRING(30), allowNull: true, field: "employeeStatus" },
    noticePeriod: { type: DataTypes.STRING(50), allowNull: true, field: "noticePeriod" },
    // ========================================================================
  workingDays: { type: DataTypes.STRING(200), allowNull: true, field: "workingDays" }, 
    weeklyOff: { type: DataTypes.STRING(30), allowNull: true, field: "weeklyOff" },
    workingHoursFrom: { type: DataTypes.STRING(10), allowNull: true, field: "workingHoursFrom" },
    workingHoursTo: { type: DataTypes.STRING(10), allowNull: true, field: "workingHoursTo" },
    workingShift: { type: DataTypes.STRING(30), allowNull: true, field: "workingShift" },
    
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "createdBy"
    },
    createdType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "createdType"
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    delete: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "delete"
    },
  };
  const options = {
    tableName: "employee",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "mobileNumber"] },
      { unique: true, fields: ["companyId", "email"] },
      { fields: ["companyId", "employeeCode"] },
    ]
  };
  const EmployeeModel = sequelize.define("employee", attributes, options);
  return EmployeeModel;
};