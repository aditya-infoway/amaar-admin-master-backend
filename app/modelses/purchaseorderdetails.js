const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    purchaseOrderDetailsId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    purchaseOrderId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    itemId: { type: DataTypes.INTEGER, allowNull: false },
    supplierId: { type: DataTypes.INTEGER, allowNull: true }, // 👈 jo supplier select hua wo yaha store hoga
    itemCode: { type: DataTypes.STRING(30) },
    itemName: { type: DataTypes.STRING(150), allowNull: false },
    hsnCode: { type: DataTypes.STRING(20) },
    uom: { type: DataTypes.STRING(20) },
    qty: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    rate: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    taxable: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    gstPct: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    gstAmt: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, defaultValue: 0 },
  };
  const options = { tableName: "purchaseorderdetails", comment: "", indexes: [] };
  return sequelize.define("purchaseorderdetails", attributes, options);
};