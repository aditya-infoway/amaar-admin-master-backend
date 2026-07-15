const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "variantId"
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
    seriesId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "seriesId"
    },
    modelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "modelId"
    },
    variantCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "variantCode"
    },
    variantName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "variantName"
    },
    bodyTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "bodyTypeId"
    },
    axleBrandId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "axleBrandId"
    },
    hydraulicBrandId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "hydraulicBrandId"
    },
    tyreBrandId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "tyreBrandId"
    },
    targetCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "targetCost"
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "sellingPrice"
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
    tableName: "variant",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "variantCode"] },
    ]
  };
  const VariantModel = sequelize.define("variant", attributes, options);
  return VariantModel;
};