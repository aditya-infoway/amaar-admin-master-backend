const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },

    groupName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "groupName",
    },

    role: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "role",
    },

    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created",
    },

    updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated",
    },

    delete: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "delete",
    },
  };

  const options = {
    tableName: "group",
    timestamps: false,
    comment: "",
    indexes: [],
  };

  const GroupModel = sequelize.define("group", attributes, options);

  return GroupModel;
};