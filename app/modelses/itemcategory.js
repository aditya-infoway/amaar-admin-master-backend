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
    categoryType: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "manual",
      field: "categoryType"
    },
    itemCodeType: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "manual",
      field: "itemCodeType"
    },
    prefix: { type: DataTypes.STRING(20), allowNull: true, field: "prefix" },
    suffix: { type: DataTypes.STRING(20), allowNull: true, field: "suffix" },
    serialNo: { type: DataTypes.STRING(20), allowNull: true, field: "serialNo" },

    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "createdBy" },
    createdType: { type: DataTypes.STRING(20), allowNull: true, field: "createdType" },
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
      {
        name: "itemcategory_company_category_active_uq",
        unique: true,
        fields: ["companyId", "categoryName"],
        where: { delete: 0 }, // sirf active rows par unique
      },
    ],
  };
  const ItemCategoryModel = sequelize.define("itemcategory", attributes, options);
  return ItemCategoryModel;
};