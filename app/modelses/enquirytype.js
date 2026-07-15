const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    enquiryTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "enquiryTypeId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    enquiryTypeName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "enquiryTypeName"
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
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
      defaultValue: 0,
      field: "delete"
    },
  };
  const options = {
    tableName: "enquirytype",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "enquiryTypeName"] },
    ]
  };
  const EnquiryTypeModel = sequelize.define("enquirytype", attributes, options);
  return EnquiryTypeModel;
};