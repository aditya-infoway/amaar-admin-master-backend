
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    createPricingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "createPricingId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "code",
    },

    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "description",
    },

    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "effectiveDate",
    },

    exShowroomPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: "exShowroomPrice",
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
      field: "status",
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
      field: "delete",
    },
  };

  const options = {
    tableName: "createpricing",

    comment: "",

    indexes: [
      {
        fields: ["companyId", "code"],
      },
    ],
  };

  const CreatePricingModel = sequelize.define(
    "createpricing",
    attributes,
    options,
  );

  return CreatePricingModel;
};

