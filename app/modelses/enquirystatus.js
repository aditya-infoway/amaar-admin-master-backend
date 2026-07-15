const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    enquiryStatusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "enquiryStatusId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    statusName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "statusName"
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
    tableName: "enquirystatus",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "statusName"] },
    ]
  };
  const EnquiryStatusModel = sequelize.define("enquirystatus", attributes, options);
  return EnquiryStatusModel;
};