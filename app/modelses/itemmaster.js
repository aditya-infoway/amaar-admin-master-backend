const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "itemId"
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    itemCode: { type: DataTypes.STRING(30), allowNull: false, field: "itemCode" },
    itemName: { type: DataTypes.STRING(150), allowNull: false, field: "itemName" },
    shortName: { type: DataTypes.STRING(50), allowNull: false, field: "shortName" },
    hsnCode: { type: DataTypes.STRING(10), allowNull: false, field: "hsnCode" },
    itemLocation: { type: DataTypes.STRING(150), allowNull: true, field: "itemLocation" },
    itemCategoryId: { type: DataTypes.INTEGER, allowNull: false, field: "itemCategoryId" },
    groupId: { type: DataTypes.INTEGER, allowNull: false, field: "groupId" },
    unit: { type: DataTypes.STRING(50), allowNull: false, field: "unit" },
    taxSlab: { type: DataTypes.STRING(50), allowNull: false, field: "taxSlab" },
    stockMapping: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "stockMapping" },
    minQty: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "minQty" },
    maxQty: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "maxQty" },
    purchasePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: "purchasePrice" },
    actualPurchasePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: "actualPurchasePrice" },
    salesPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: "salesPrice" },
    mrp: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: "mrp" },
    barcodeType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "manual", field: "barcodeType" },
    barcode: { type: DataTypes.STRING(30), allowNull: true, field: "barcode" },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active", field: "status" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "itemmaster",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "itemCode"] },
      { unique: true, fields: ["companyId", "barcode"] },
    ]
  };
  const ItemMasterModel = sequelize.define("itemmaster", attributes, options);
  return ItemMasterModel;
};