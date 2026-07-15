const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    professionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "professionId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    professionName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "professionName"
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
      field: "status"
    },
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
    delete: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "delete"
    },
  };
  const options = {
    tableName: "profession",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "professionName"] },
    ]
  };
  const ProfessionModel = sequelize.define("profession", attributes, options);
  return ProfessionModel;
};