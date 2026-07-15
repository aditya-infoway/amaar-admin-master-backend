const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    axleBrandId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "axleBrandId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    axleBrandName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "axleBrandName"
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
    tableName: "axlebrand",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "axleBrandName"] },
    ]
  };
  const AxleBrandModel = sequelize.define("axlebrand", attributes, options);
  return AxleBrandModel;
};