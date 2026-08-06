const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    // ===== Primary key ab "leadId" naam se =====
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "leadId"
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    financialYearId: { type: DataTypes.INTEGER, allowNull: true, field: "financialYearId" },
    // ===== Generated code (purchase billNo jaisa), readonly frontend pe =====
    leadCode: { type: DataTypes.STRING(50), allowNull: false, field: "leadCode" },
    name: { type: DataTypes.STRING(100), allowNull: false, field: "name" },
    number: { type: DataTypes.STRING(15), allowNull: false, field: "number" },
    email: { type: DataTypes.STRING(100), allowNull: true, field: "email" },
    address: { type: DataTypes.STRING(255), allowNull: true, field: "address" },
    city: { type: DataTypes.STRING(100), allowNull: true, field: "city" },
    model: { type: DataTypes.INTEGER, allowNull: true, field: "model" },
    remark: { type: DataTypes.STRING(255), allowNull: true, field: "remark" },
    nextFollowupDate: { type: DataTypes.STRING(20), allowNull: true, field: "nextFollowupDate" },

    createdBy: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "createdBy" },
    createdType: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "Manual", field: "createdType" },

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "lead",
    comment: "",
    indexes: [
      { fields: ["companyId"] },
      { fields: ["leadCode"] },
    ]
  };
  const Lead = sequelize.define("lead", attributes, options);
  return Lead;
};