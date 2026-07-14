const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    productSeriesId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "productSeriesId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "categoryId"
    },
    seriesCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "seriesCode"
    },
    seriesName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "seriesName"
    },
    capacity: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "capacity"
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
    tableName: "productseries",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "seriesCode"] },
    ]
  };
  const ProductSeriesModel = sequelize.define("productseries", attributes, options);
  return ProductSeriesModel;
};