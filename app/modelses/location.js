const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    locationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "locationId",
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },
    locationCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "locationCode",
    },
    locationName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "locationName",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
      field: "status",
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
      field: "delete",
    },
  };

  const options = {
    tableName: "location",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "locationCode"] },
      { unique: true, fields: ["companyId", "locationName"] },
    ],
  };

  const LocationModel = sequelize.define("location", attributes, options);
  return LocationModel;
};