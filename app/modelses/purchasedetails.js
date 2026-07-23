const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    purchaseDetailsId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    purchaseId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    itemId: { type: DataTypes.INTEGER, allowNull: false },
    itemCode: { type: DataTypes.STRING(30), allowNull: false },
    itemName: { type: DataTypes.STRING(150), allowNull: false },
    hsnCode: { type: DataTypes.STRING(20) },
    uom: { type: DataTypes.STRING(20) },
    qty: { type: DataTypes.DECIMAL(12,3), allowNull: false },
    rate: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
    taxable: { type: DataTypes.DECIMAL(15,2), allowNull: false },
    gstPct: { type: DataTypes.DECIMAL(5,2), allowNull: false },
    gstAmt: { type: DataTypes.DECIMAL(15,2), allowNull: false },
    total: { type: DataTypes.DECIMAL(15,2), allowNull: false },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "verified" },
    currentStock: { type: DataTypes.DECIMAL(12,3), allowNull: false, defaultValue: 0, field: "currentStock" },
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
    delete: { type: DataTypes.INTEGER, defaultValue: 0 }
  };
  const options = {
    tableName: "purchasedetails",
    comment: "",
    indexes: []
  };
  const PurchaseDetailModel = sequelize.define("purchasedetails", attributes, options);
  return PurchaseDetailModel;
};