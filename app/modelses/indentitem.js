const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    indentItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "indentItemId",
    },

    indentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "indentId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    bomItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "bomItemId",
    },

    itemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "itemId",
    },

    itemCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "itemCode",
    },

    itemName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "itemName",
    },

    itemLocation: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "itemLocation",
    },

    category: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "category",
    },

    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "unit",
    },

    availableStock: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: "availableStock",
    },

    requiredStock: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: "requiredStock",
    },

    purchaseRequired: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: "purchaseRequired",
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
  };

  const options = {
    tableName: "indentitem",

    comment: "",

    indexes: [
      { fields: ["indentId"] },
    ],
  };

  const IndentItemModel = sequelize.define(
    "indentItem",
    attributes,
    options
  );

  return IndentItemModel;
};