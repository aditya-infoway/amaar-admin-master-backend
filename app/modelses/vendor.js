const {
  DataTypes
} = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    vendorId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
      comment: null,
      field: "vendorId"
    },
    appVersion: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "appVersion"
    },
    osVersion: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "osVersion"
    },
    model: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "model"
    },
    os: {
      type: DataTypes.ENUM('IOS', 'ANDRIOD'),
      allowNull: false,
      defaultValue: "ANDRIOD",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "os"
    },
    vendorType: {
      type: DataTypes.ENUM('INDIVIDUAL', 'COMPANY'),
      allowNull: false,
      defaultValue: "INDIVIDUAL",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "vendorType"
    },
    firstName: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "firstName"
    },
    lastName: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "lastName"
    },
    fullName: {
      type: DataTypes.STRING(80),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "fullName"
    },
    countryCode: {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "countryCode"
    },
    mobileNumber: {
      type: DataTypes.STRING(15),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "mobileNumber"
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "logo"
    },
    email: {
      type: DataTypes.STRING(35),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "email"
    },
    userName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "userName"
    },
    password: {
      type: DataTypes.STRING(35),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "password"
    },
    companyRegistrationNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "companyRegistrationNumber"
    },
    uenNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "uenNumber"
    },
    businessName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "businessName"
    },
    noOfPeople: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "noOfPeople"
    },
    companyAdrress: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "companyAdrress"
    },
    latitude: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "latitude"
    },
    longitude: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "longitude"
    },
    ownerDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "ownerDetails"
    },
    otp: {
      type: DataTypes.INTEGER(5),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "otp"
    },
    status: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: "-1",
      primaryKey: false,
      autoIncrement: false,
      comment: "0 = Pending , 1 = Approve(InProgress) 2 = Complete 3 = Rejecte,4- User Complete Or Done Service,5 - User Side To Cancel Service,6 - Driver Or Assoicate Complete service ,\r\n-1 = Register and login but not completed steps\r\n",
      field: "status"
    },
    block: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "block"
    },
    rejectReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "rejectReason"
    },
    isVerified: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: "0-NotVerified, 1-Verified",
      field: "isVerified"
    },
    isAssociate: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "isAssociate"
    },
    sosService: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: "0- uncheck & 1- check",
      field: "sosService"
    },
    selectAssociate: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "selectAssociate"
    },
    isCompanyVerified: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: "1",
      primaryKey: false,
      autoIncrement: false,
      comment: "0-Not Verify, 1-verify",
      field: "isCompanyVerified"
    },
    countryId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "countryId"
    },
    postalCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "postalCode"
    },
    roadName: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "roadName"
    },
    unitNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "unitNumber"
    },
    blockNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "blockNumber"
    },
    amount: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "amount"
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.fn('current_timestamp'),
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "created"
    },
    createdBy: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "createdBy"
    },
    updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.fn('current_timestamp'),
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "updated"
    },
    updatedBy: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "updatedBy"
    },
    delete: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "delete"
    },
    deletedBy: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: "0",
      primaryKey: false,
      autoIncrement: false,
      comment: null,
      field: "deletedBy"
    }
  };
  const options = {
    tableName: "vendor",
    comment: "",
    indexes: []
  };
  const VendorModel = sequelize.define("vendor_model", attributes, options);
  return VendorModel;
};