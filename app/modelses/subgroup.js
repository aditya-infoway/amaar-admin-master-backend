const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    subGroupId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true, field: "subGroupId" },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    itemCategoryId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "itemCategoryId" },
    groupId: { type: DataTypes.INTEGER, allowNull: false, field: "groupId" },
    parentSubGroupId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null, field: "parentSubGroupId" },
    subGroupName: { type: DataTypes.STRING(100), allowNull: false, field: "subGroupName" },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active", field: "status" },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "createdBy" },
    createdType: { type: DataTypes.STRING(20), allowNull: true, field: "createdType" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "subgroup",
    comment: "",
    indexes: [{ unique: true, fields: ["companyId", "subGroupName"] }],
  };
  return sequelize.define("subgroup", attributes, options);
};