const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    subProcessId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true, field: "subProcessId" },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    financialYearId: { type: DataTypes.INTEGER, allowNull: true, field: "financialYearId" },
    processId: { type: DataTypes.INTEGER, allowNull: false, field: "processId" },
    subProcessName: { type: DataTypes.STRING(150), allowNull: false, field: "subProcessName" },
    subProcessCode: { type: DataTypes.STRING(50), allowNull: false, field: "subProcessCode" },
    serialNo: { type: DataTypes.INTEGER, allowNull: false, field: "serialNo" },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Active", field: "status" },
    createdBy: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "createdBy" },
    createdType: { type: DataTypes.STRING(50), allowNull: true, field: "createdType" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };

  const options = {
    tableName: "sub_process",
    comment: "",
    indexes: [{ fields: ["companyId", "processId"] }],
  };

  return sequelize.define("sub_process", attributes, options);
};