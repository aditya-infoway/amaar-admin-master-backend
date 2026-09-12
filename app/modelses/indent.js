const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    indentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "indentId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    financialYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "financialYearId",
    },

    indentNo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "indentNo",
    },

    workOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "workOrderId",
    },

    modelItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "modelItemId",
    },

    modelName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "modelName",
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Generated",
      field: "status",
    },

    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "createdBy",
    },

    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created",
    },

    updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated",
    },

    delete: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "delete",
    },
  };

  const options = {
    tableName: "indent",

    comment: "",

    indexes: [
      { unique: true, fields: ["companyId", "workOrderId"] },
      { fields: ["companyId", "financialYearId", "indentNo"] },
    ],
  };

  const IndentModel = sequelize.define(
    "indent",
    attributes,
    options
  );

  return IndentModel;
};