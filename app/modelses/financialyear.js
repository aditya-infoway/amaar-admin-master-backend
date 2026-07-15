const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    financialYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "financialYearId"
    },
    companyDetailsId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyDetailsId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "startDate"
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "endDate"
    },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "financialyear",
    comment: "",
    indexes: []
  };
  const FinancialYearModel = sequelize.define("financialyear", attributes, options);
  return FinancialYearModel;
};