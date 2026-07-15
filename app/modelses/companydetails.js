const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    companyDetailsId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "companyDetailsId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },

    // Company Information
    companyName: { type: DataTypes.STRING(255), allowNull: true, field: "companyName" },
    natureOfBusiness: { type: DataTypes.STRING(255), allowNull: true, field: "natureOfBusiness" },
    taxSystem: { type: DataTypes.STRING(50), allowNull: true, field: "taxSystem" },

    // Basic Details
    addressLine1: { type: DataTypes.STRING(255), allowNull: true, field: "addressLine1" },
    addressLine2: { type: DataTypes.STRING(255), allowNull: true, field: "addressLine2" },
    city: { type: DataTypes.STRING(100), allowNull: true, field: "city" },
    pinCode: { type: DataTypes.STRING(10), allowNull: true, field: "pinCode" },
    country: { type: DataTypes.STRING(100), allowNull: true, field: "country" },
    state: { type: DataTypes.STRING(100), allowNull: true, field: "state" },
    stateCode: { type: DataTypes.STRING(20), allowNull: true, field: "stateCode" },
    district: { type: DataTypes.STRING(100), allowNull: true, field: "district" },
    mobile: { type: DataTypes.STRING(15), allowNull: true, field: "mobile" },
    phone: { type: DataTypes.STRING(15), allowNull: true, field: "phone" },
    email: { type: DataTypes.STRING(255), allowNull: true, field: "email" },
    website: { type: DataTypes.STRING(255), allowNull: true, field: "website" },
    dateFormat: { type: DataTypes.STRING(20), allowNull: true, field: "dateFormat" },

    // Registration Details
    gstNo: { type: DataTypes.STRING(20), allowNull: true, field: "gstNo" },
    vatNo: { type: DataTypes.STRING(20), allowNull: true, field: "vatNo" },
    panNo: { type: DataTypes.STRING(20), allowNull: true, field: "panNo" },
    tanNo: { type: DataTypes.STRING(20), allowNull: true, field: "tanNo" },

    // Licensing
    dlNo1: { type: DataTypes.STRING(50), allowNull: true, field: "dlNo1" },
    dlNo2: { type: DataTypes.STRING(50), allowNull: true, field: "dlNo2" },
    dealsIn: { type: DataTypes.STRING(255), allowNull: true, field: "dealsIn" },

    // Bank Details
    bankHolderName: { type: DataTypes.STRING(255), allowNull: true, field: "bankHolderName" },
    bankAccountNo: { type: DataTypes.STRING(20), allowNull: true, field: "bankAccountNo" },
    branchName: { type: DataTypes.STRING(100), allowNull: true, field: "branchName" },
    ifscCode: { type: DataTypes.STRING(15), allowNull: true, field: "ifscCode" },
    logo: { type: DataTypes.STRING(255), allowNull: true, field: "logo" },

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "companydetails",
    comment: "",
    indexes: []
  };
  const CompanyDetailsModel = sequelize.define("companydetails", attributes, options);
  return CompanyDetailsModel;
};