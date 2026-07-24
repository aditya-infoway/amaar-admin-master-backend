const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    purchaseOrderId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    financialYearId: { type: DataTypes.INTEGER, allowNull: false },
    poNumber: { type: DataTypes.STRING(50), allowNull: false },
    poDate: { type: DataTypes.DATEONLY, allowNull: false },
    requiredDate: { type: DataTypes.DATEONLY, allowNull: true },
    branchId: { type: DataTypes.INTEGER, allowNull: true },
    narration: { type: DataTypes.TEXT, allowNull: true },

    taxableValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    gstAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    roundAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    grandTotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },

    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Draft" }, // Draft | Generated

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, defaultValue: 0 },
  };
  const options = {
    tableName: "purchaseorder",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "financialYearId", "poNumber"] },
    ],
  };
  return sequelize.define("purchaseorder", attributes, options);
};