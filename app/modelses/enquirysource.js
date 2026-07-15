const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    enquirySourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "enquirySourceId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    sourceName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "sourceName"
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
    tableName: "enquirysource",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "sourceName"] },
    ]
  };
  const EnquirySourceModel = sequelize.define("enquirysource", attributes, options);
  return EnquirySourceModel;
};