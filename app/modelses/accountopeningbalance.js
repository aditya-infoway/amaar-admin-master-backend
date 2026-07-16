const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "id"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    financialYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "financialYearId"
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "accountId"
    },
    openingBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "openingBalance"
    },
    drOrCr: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: "DR",
      field: "drOrCr"
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "createdBy" },
    createdType: { type: DataTypes.STRING(30), allowNull: true, field: "createdType" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "accountopeningbalance",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "financialYearId", "accountId"] },
    ]
  };
  const AccountOpeningBalanceModel = sequelize.define("accountopeningbalance", attributes, options);
  return AccountOpeningBalanceModel;
};