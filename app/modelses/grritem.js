// models/grritem.js
const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const attributes = {
    grrItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    grrId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    purchaseOrderId: { type: DataTypes.INTEGER, allowNull: false },
    purchaseOrderDetailsId: { type: DataTypes.INTEGER, allowNull: false },
    itemId: { type: DataTypes.INTEGER, allowNull: false },

    // snapshot at verify time (same pattern as indentitem)
    itemCode: { type: DataTypes.STRING(50), allowNull: true },
    itemName: { type: DataTypes.STRING(150), allowNull: false },
    hsnCode: { type: DataTypes.STRING(20), allowNull: true },

    orderQty: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    inQty: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    difference: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    }, // orderQty - inQty : +short / -excess

    delete: { type: DataTypes.INTEGER, defaultValue: 0 },
  };
  const options = {
    tableName: "grritem",
    comment: "",
  };
  return sequelize.define("grritem", attributes, options);
};