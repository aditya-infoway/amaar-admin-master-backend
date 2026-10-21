const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    itemReturnId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    itemRequestId: { type: DataTypes.INTEGER },
    itemRequestDetailId: { type: DataTypes.INTEGER },
    itemId: { type: DataTypes.INTEGER, allowNull: false },
    qty: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    returnedBy: { type: DataTypes.INTEGER },   // jisne return kiya (contractor / department employee)
    receivedBy: { type: DataTypes.INTEGER },   // store manager
    returnNo: { type: DataTypes.STRING(50) },
    returnDate: { type: DataTypes.DATEONLY },
    financialYearId: { type: DataTypes.INTEGER },
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
    tableName: "itemreturn",
    comment: "",
    indexes: []
  };
  const ItemReturnModel = sequelize.define("itemreturn", attributes, options);
  return ItemReturnModel;
};