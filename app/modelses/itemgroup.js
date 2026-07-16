const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    itemGroupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "itemGroupId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    groupName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "groupName"
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
    tableName: "itemgroup",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "groupName"] },
    ]
  };
  const ItemGroupModel = sequelize.define("itemgroup", attributes, options);
  return ItemGroupModel;
};