const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const attributes = {
    qcId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    financialYearId: { type: DataTypes.INTEGER, allowNull: false },
    grrId: { type: DataTypes.INTEGER, allowNull: false },
    purchaseOrderId: { type: DataTypes.INTEGER, allowNull: true },
    qcNo: { type: DataTypes.STRING(50), allowNull: false },
    qcDate: { type: DataTypes.DATEONLY, allowNull: false },
    serialNo: { type: DataTypes.INTEGER, allowNull: true },
    supplierId: { type: DataTypes.INTEGER, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Completed",
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    createdType: { type: DataTypes.STRING(20), allowNull: true },
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
    delete: { type: DataTypes.INTEGER, defaultValue: 0 },
  };
  const options = {
    tableName: "qc",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "financialYearId", "qcNo"] },
      {
        // one QC per GRR — drop this if multiple QCs per GRR get allowed
        unique: true,
        fields: ["companyId", "grrId"],
      },
    ],
  };
  return sequelize.define("qc", attributes, options);
};
