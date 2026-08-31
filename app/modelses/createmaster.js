const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    createMasterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "createMasterId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    type: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "type",
    },

    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "description",
    },

    actualItem: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "actualItem",
    },

code: {
  type: DataTypes.STRING(100),
  allowNull: true,
  field: "code",
},

totalWeight: {
  type: DataTypes.DECIMAL(15, 2),
  allowNull: true,
  field: "totalWeight",
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
    tableName: "createmaster",

    comment: "",

    indexes: [
      {
        fields: ["companyId", "type"],
      },
    ],
  };

  const CreateMasterModel = sequelize.define(
    "createmaster",
    attributes,
    options,
  );

  return CreateMasterModel;
};
