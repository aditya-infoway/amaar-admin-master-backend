const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const attributes = {
    qcItemId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    qcId: { type: DataTypes.INTEGER, allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    grrId: { type: DataTypes.INTEGER, allowNull: false },
    grrItemId: { type: DataTypes.INTEGER, allowNull: false },
    itemId: { type: DataTypes.INTEGER, allowNull: true },
    itemCode: { type: DataTypes.STRING(100), allowNull: true },
    itemName: { type: DataTypes.STRING(255), allowNull: true },
    hsnCode: { type: DataTypes.STRING(50), allowNull: true },
    inQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },     // qty received in GRR
    verifyQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, // qty entered manually in QC
    rQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },      // inQty - verifyQty
    delete: { type: DataTypes.INTEGER, defaultValue: 0 },
  };
  const options = { tableName: "qcitem", comment: "" };
  return sequelize.define("qcitem", attributes, options);
};