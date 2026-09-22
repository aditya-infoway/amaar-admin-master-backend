const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    itemRequestDetailId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "itemRequestDetailId",
    },

    itemRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "itemRequestId",
    },

    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "itemId",
    },

    itemCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "itemCode",
    },

    itemName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "itemName",
    },

    qty: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "qty",
    },

    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "unit",
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
    tableName: "itemrequestdetail",
    comment: "",
    indexes: [
      { fields: ["itemRequestId"] },
      { fields: ["itemId"] },
    ],
  };

  const ItemRequestDetailModel = sequelize.define(
    "itemrequestdetail",
    attributes,
    options
  );

  return ItemRequestDetailModel;
};