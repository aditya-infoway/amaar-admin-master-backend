const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    itemIssueId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    itemRequestId: { type: DataTypes.INTEGER },
    itemRequestDetailId: { type: DataTypes.INTEGER },
    itemId: { type: DataTypes.INTEGER, allowNull: false },
    qty: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    issuedTo: { type: DataTypes.INTEGER },
    issuedBy: { type: DataTypes.INTEGER },
    billNo: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.STRING(20), defaultValue: "Pending" }, // ✅ naya field
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
    tableName: "itemissue",
    comment: "",
    indexes: []
  };
  const ItemIssueModel = sequelize.define("itemissue", attributes, options);
  return ItemIssueModel;
};