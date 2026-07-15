const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    bodyTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "bodyTypeId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    bodyTypeName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "bodyTypeName"
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
    tableName: "bodytype",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "bodyTypeName"] },
    ]
  };
  const BodyTypeModel = sequelize.define("bodytype", attributes, options);
  return BodyTypeModel;
};