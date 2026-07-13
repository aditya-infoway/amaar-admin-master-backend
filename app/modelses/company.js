const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: "companyId"
    },

    // ---- Company Information ----
    companyName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "companyName"
    },
    companyAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "companyAddress"
    },
    contactNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      field: "contactNumber"
    },
    businessEmail: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: "businessEmail"
    },
    ownerName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "ownerName"
    },
    ownerContactNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      field: "ownerContactNumber"
    },
    ownerEmail: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "ownerEmail"
    },
    country: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: "country"
    },
    state: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: "state"
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "district"
    },
    taluka: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "taluka"
    },

    // ---- Business Information ----
    registrationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "registrationDate"
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "expiryDate"
    },
    businessType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "businessType"
    },
    employeeSize: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "employeeSize"
    },
    gstNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      field: "gstNumber"
    },
    panNumber: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      field: "panNumber"
    },
    aadhaarNumber: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
      field: "aadhaarNumber"
    },

    // ---- Login Information ----
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: "email"
    },
    password: {
      type: DataTypes.STRING(255), // bcrypt hash — longer than raw password
      allowNull: false,
      field: "password"
    },
    token: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "token"
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: "otp"
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDING", // PENDING | APPROVED | REJECTED
      field: "status"
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
      defaultValue: "0",
      field: "delete"
    },
  };
  const options = {
    tableName: "company",
    comment: "",
    indexes: []
  };
  const CompanyModel = sequelize.define("company", attributes, options);
  return CompanyModel;
};