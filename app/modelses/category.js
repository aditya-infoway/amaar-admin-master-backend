const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "categoryId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "code"
    },
    categoryName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "categoryName"
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
    tableName: "category",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "code"] },
    ]
  };
  const CategoryModel = sequelize.define("category", attributes, options);
  return CategoryModel;
};