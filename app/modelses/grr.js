// models/grr.js
const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const attributes = {
    grrId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    financialYearId: { type: DataTypes.INTEGER, allowNull: false },
    purchaseOrderId: { type: DataTypes.INTEGER, allowNull: false },
    grrNo: { type: DataTypes.STRING(50), allowNull: false },
    grrDate: { type: DataTypes.DATEONLY, allowNull: false },
    serialNo: { type: DataTypes.INTEGER, allowNull: true },
    supplierId: { type: DataTypes.INTEGER, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Completed",
    }, // Completed (verify happens client-side across two stages before save)

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
    tableName: "grr",
    comment: "",
    indexes: [
      {
        unique: true,
        fields: ["companyId", "financialYearId", "grrNo"],
      },
      {
        // enforce one GRR per PO — drop this if partial GRRs get allowed later
        unique: true,
        fields: ["companyId", "purchaseOrderId"],
      },
    ],
  };
  return sequelize.define("grr", attributes, options);
};