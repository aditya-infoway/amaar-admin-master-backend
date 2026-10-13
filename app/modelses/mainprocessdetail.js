const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    processId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "processId",
    },
    mainProcessId: { type: DataTypes.INTEGER, allowNull: false, field: "mainProcessId" },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    processCode: { type: DataTypes.STRING(50), allowNull: false, field: "processCode" },
    processName: { type: DataTypes.STRING(150), allowNull: false, field: "processName" },
    serialNo: { type: DataTypes.INTEGER, allowNull: false, field: "serialNo" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };

  const options = {
    tableName: "main_process_detail",
    comment: "",
    indexes: [{ fields: ["mainProcessId"] }],
  };

  return sequelize.define("main_process_detail", attributes, options);
};