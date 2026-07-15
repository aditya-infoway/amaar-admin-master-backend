const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    modelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "modelId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "categoryId"
    },
    seriesId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "seriesId"
    },
    modelCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "modelCode"
    },
    modelName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "modelName"
    },
    axleType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "axleType"
    },
    capacity: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "capacity"
    },
    length: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "length"
    },
    width: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "width"
    },
    height: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "height"
    },
    standardWeight: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "standardWeight"
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
    tableName: "model",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "modelCode"] },
    ]
  };
  const ModelModel = sequelize.define("model", attributes, options);
  return ModelModel;
};