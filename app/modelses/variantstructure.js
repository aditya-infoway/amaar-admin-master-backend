// models/variantstructure.js
const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    variantStructureId: {
      type: DataTypes.INTEGER, allowNull: false, primaryKey: true,
      autoIncrement: true, field: "variantStructureId"
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    variantId: { type: DataTypes.INTEGER, allowNull: false, field: "variantId" },

    bodyLength: { type: DataTypes.STRING(50), allowNull: false, field: "bodyLength" },
    bodyWidth: { type: DataTypes.STRING(50), allowNull: true, field: "bodyWidth" },
    bodyHeight: { type: DataTypes.STRING(50), allowNull: true, field: "bodyHeight" },
    capacity: { type: DataTypes.STRING(50), allowNull: true, field: "capacity" },
    axleCount: { type: DataTypes.STRING(20), allowNull: true, field: "axleCount" },
    suspensionType: { type: DataTypes.STRING(50), allowNull: true, field: "suspensionType" },
    tyreSize: { type: DataTypes.STRING(50), allowNull: true, field: "tyreSize" },
    kingPin: { type: DataTypes.STRING(50), allowNull: true, field: "kingPin" },
    brakeSystem: { type: DataTypes.STRING(50), allowNull: true, field: "brakeSystem" },
    hydraulicDetails: { type: DataTypes.STRING(255), allowNull: true, field: "hydraulicDetails" },
    paintType: { type: DataTypes.STRING(50), allowNull: true, field: "paintType" },
    floorPlateThk: { type: DataTypes.STRING(50), allowNull: true, field: "floorPlateThk" },
    sidePlateThk: { type: DataTypes.STRING(50), allowNull: true, field: "sidePlateThk" },
    chassisType: { type: DataTypes.STRING(50), allowNull: true, field: "chassisType" },
    etc: { type: DataTypes.STRING(255), allowNull: true, field: "etc" },

    // JSON string me store honge (checkbox maps)
    standardFeatures: { type: DataTypes.TEXT, allowNull: true, field: "standardFeatures" },
    optionalAccessories: { type: DataTypes.TEXT, allowNull: true, field: "optionalAccessories" },

    productImage: { type: DataTypes.STRING(255), allowNull: true, field: "productImage" },
    brochurePdf: { type: DataTypes.STRING(255), allowNull: true, field: "brochurePdf" },
    drawingPdf: { type: DataTypes.STRING(255), allowNull: true, field: "drawingPdf" },
    specSheet: { type: DataTypes.STRING(255), allowNull: true, field: "specSheet" },

    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active", field: "status" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };

  // NOTE: DB-level unique constraint jaan-bujhkar nahi lagaya (soft delete ke saath conflict
  // karega). Uniqueness (1 variant = 1 structure) controller me delete:0 check se enforce hoti hai.
  const options = {
    tableName: "variantstructure",
    comment: "",
  };

  return sequelize.define("variantstructure", attributes, options);
};