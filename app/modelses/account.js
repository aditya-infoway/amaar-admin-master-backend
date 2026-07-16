const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "id"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    accountName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "accountName"
    },
    printName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "printName"
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "groupId"
    },
    openingBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "openingBalance"
    },
    drOrCr: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: "DR",
      field: "drOrCr"
    },
    currentBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "currentBalance"
    },
    currentDrOrCr: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: "DR",
      field: "currentDrOrCr"
    },
    countryName: { type: DataTypes.STRING(100), allowNull: false, field: "countryName" },
    stateName: { type: DataTypes.STRING(100), allowNull: false, field: "stateName" },
    districtName: { type: DataTypes.STRING(100), allowNull: true, field: "districtName" },
    talukaName: { type: DataTypes.STRING(100), allowNull: true, field: "talukaName" },
    cityName: { type: DataTypes.STRING(100), allowNull: true, field: "cityName" },
    area: { type: DataTypes.STRING(150), allowNull: true, field: "area" },
    addressLine1: { type: DataTypes.STRING(255), allowNull: false, field: "addressLine1" },
    addressLine2: { type: DataTypes.STRING(255), allowNull: true, field: "addressLine2" },
    pincode: { type: DataTypes.STRING(10), allowNull: false, field: "pincode" },
    phoneNo: { type: DataTypes.STRING(15), allowNull: true, field: "phoneNo" },
    mobileNo: { type: DataTypes.STRING(15), allowNull: false, field: "mobileNo" },
    email: { type: DataTypes.STRING(150), allowNull: true, field: "email" },
    contactPersonName: { type: DataTypes.STRING(150), allowNull: true, field: "contactPersonName" },
    birthdayOn: { type: DataTypes.DATEONLY, allowNull: true, field: "birthdayOn" },
    anniversary: { type: DataTypes.DATEONLY, allowNull: true, field: "anniversary" },
    bankAccountNo: { type: DataTypes.STRING(30), allowNull: true, field: "bankAccountNo" },
    bankName: { type: DataTypes.STRING(150), allowNull: true, field: "bankName" },
    ifscCode: { type: DataTypes.STRING(15), allowNull: true, field: "ifscCode" },
    branchName: { type: DataTypes.STRING(150), allowNull: true, field: "branchName" },
    gstNo: { type: DataTypes.STRING(15), allowNull: true, field: "gstNo" },
    panCard: { type: DataTypes.STRING(10), allowNull: true, field: "panCard" },
    aadharCardNo: { type: DataTypes.STRING(12), allowNull: true, field: "aadharCardNo" },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
      field: "status"
    },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "account",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "mobileNo"] },
    ]
  };
  const AccountModel = sequelize.define("account", attributes, options);
  return AccountModel;
};