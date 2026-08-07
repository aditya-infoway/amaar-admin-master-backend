const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    prefixId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "prefixId",
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },
    prefixFor: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "prefixFor", // e.g. PURCHASE, PURCHASE ORDER, LEAD ...
    },
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "prefix", // e.g. PUR, LD
    },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "companyprefix",
    comment: "",
    indexes: [
      {
        unique: true,
        fields: ["companyId", "prefixFor", "delete"],
        name: "uniq_company_prefixfor",
      },
    ],
  };
  const CompanyPrefixModel = sequelize.define("companyprefix", attributes, options);
  return CompanyPrefixModel;
};