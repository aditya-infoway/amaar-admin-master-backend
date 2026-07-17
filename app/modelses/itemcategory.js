const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    itemCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "itemCategoryId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
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
    tableName: "itemcategory",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "categoryName"] },
    ]
  };
  const ItemCategoryModel = sequelize.define("itemcategory", attributes, options);
  return ItemCategoryModel;
};