const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const attributes = {
    bomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "bomId"
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    bomName: { type: DataTypes.STRING(150), allowNull: false, field: "bomName" },
    bomCode: { type: DataTypes.STRING(50), allowNull: false, field: "bomCode" },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active", field: "status" },

    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "createdBy" },

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };

  const options = {
    tableName: "bom",
    comment: "BOM header",
    indexes: [
      { fields: ["companyId"] },
      { fields: ["bomCode"] },
    ]
  };

  const Bom = sequelize.define("bom", attributes, options);
  return Bom;
};