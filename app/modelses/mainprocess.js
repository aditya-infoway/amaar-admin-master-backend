const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    mainProcessId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "mainProcessId",
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    financialYearId: { type: DataTypes.INTEGER, allowNull: true, field: "financialYearId" },
    mainProcess: { type: DataTypes.STRING(150), allowNull: false, field: "mainProcess" },
 status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Inactive", field: "status" },
    createdBy: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "createdBy" },
    createdType: { type: DataTypes.STRING(50), allowNull: true, field: "createdType" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };

  const options = {
    tableName: "main_process",
    comment: "",
    indexes: [{ fields: ["companyId", "mainProcess"] }],
  };

  return sequelize.define("main_process", attributes, options);
};