const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    visitorEntryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "visitorEntryId"
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    visitorId: { type: DataTypes.STRING(30), allowNull: false, field: "visitorId" },

    // Personal Details
    fullName: { type: DataTypes.STRING(100), allowNull: false, field: "fullName" },
    gender: { type: DataTypes.STRING(20), allowNull: true, field: "gender" },
    mobileNumber: { type: DataTypes.STRING(15), allowNull: false, field: "mobileNumber" },
    email: { type: DataTypes.STRING(100), allowNull: true, field: "email" },
    company: { type: DataTypes.STRING(100), allowNull: true, field: "company" },
    address: { type: DataTypes.STRING(255), allowNull: true, field: "address" },
    country: { type: DataTypes.STRING(100), allowNull: true, field: "country" },
    state: { type: DataTypes.STRING(100), allowNull: true, field: "state" },
    city: { type: DataTypes.STRING(100), allowNull: true, field: "city" },
    pincode: { type: DataTypes.STRING(20), allowNull: true, field: "pincode" },

    // Identity Proof
    idProofType: { type: DataTypes.STRING(50), allowNull: true, field: "idProofType" },
    idProofNumber: { type: DataTypes.STRING(50), allowNull: true, field: "idProofNumber" },
    idFrontPhoto: { type: DataTypes.STRING(255), allowNull: true, field: "idFrontPhoto" },
    idBackPhoto: { type: DataTypes.STRING(255), allowNull: true, field: "idBackPhoto" },

    // Visit Details
    visitDate: { type: DataTypes.STRING(20), allowNull: true, field: "visitDate" },
    entryTime: { type: DataTypes.STRING(20), allowNull: true, field: "entryTime" },
    exitTime: { type: DataTypes.STRING(20), allowNull: true, field: "exitTime" },
    purpose: { type: DataTypes.STRING(150), allowNull: true, field: "purpose" },
    department: { type: DataTypes.STRING(100), allowNull: true, field: "department" },
    personToMeet: { type: DataTypes.STRING(100), allowNull: true, field: "personToMeet" },
    employeeId: { type: DataTypes.STRING(50), allowNull: true, field: "employeeId" },
    duration: { type: DataTypes.STRING(50), allowNull: true, field: "duration" },

    // Visitor Information
    numberOfPersons: { type: DataTypes.STRING(10), allowNull: true, field: "numberOfPersons" },
    adultCount: { type: DataTypes.STRING(10), allowNull: true, field: "adultCount" },
    childCount: { type: DataTypes.STRING(10), allowNull: true, field: "childCount" },
    accompanyingPerson: { type: DataTypes.STRING(100), allowNull: true, field: "accompanyingPerson" },
    vehicleAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "vehicleAvailable" },
    vehicleNumber: { type: DataTypes.STRING(30), allowNull: true, field: "vehicleNumber" },
    previousVisit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "previousVisit" },
    frequentVisitor: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "frequentVisitor" },

    // Security Details
    gate: { type: DataTypes.STRING(20), allowNull: true, field: "gate" },
    securityGuard: { type: DataTypes.STRING(100), allowNull: true, field: "securityGuard" },
    mobileCount: { type: DataTypes.STRING(10), allowNull: true, field: "mobileCount" },
    allowedAreas: { type: DataTypes.STRING(255), allowNull: true, field: "allowedAreas" },
    restrictedAreas: { type: DataTypes.STRING(255), allowNull: true, field: "restrictedAreas" },
    otherItems: { type: DataTypes.STRING(255), allowNull: true, field: "otherItems" },
    bagChecked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "bagChecked" },
    laptop: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "laptop" },
    camera: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "camera" },
    visitorPhoto: { type: DataTypes.STRING(255), allowNull: true, field: "visitorPhoto" },

    // OTP + Check-in
    otp: { type: DataTypes.STRING(10), allowNull: true, field: "otp" },
    otpGeneratedAt: { type: DataTypes.STRING(50), allowNull: true, field: "otpGeneratedAt" },
    otpVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "otpVerified" },
    checkInTime: { type: DataTypes.STRING(50), allowNull: true, field: "checkInTime" },
    checkOutTime: { type: DataTypes.STRING(50), allowNull: true, field: "checkOutTime" },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "HOLD", field: "status" }, // HOLD / IN / OUT

    // Gate Pass
    badgeNumber: { type: DataTypes.STRING(30), allowNull: true, field: "badgeNumber" },
    gatePassNumber: { type: DataTypes.STRING(30), allowNull: true, field: "gatePassNumber" },
    gatePassIssuedAt: { type: DataTypes.STRING(50), allowNull: true, field: "gatePassIssuedAt" },

    // Exit Details
    exitGate: { type: DataTypes.STRING(20), allowNull: true, field: "exitGate" },
    badgeReturned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "badgeReturned" },
    exitRemarks: { type: DataTypes.STRING(255), allowNull: true, field: "exitRemarks" },

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

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "visitorentry",
    comment: "",
    indexes: [
      { fields: ["companyId"] },
      { fields: ["status"] },
    ]
  };
  const VisitorEntry = sequelize.define("visitorentry", attributes, options);
  return VisitorEntry;
};