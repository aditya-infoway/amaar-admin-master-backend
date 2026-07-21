const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "roleId"
    },
    department: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "department"
    },
    roleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "roleName"
    },
    delete: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "delete"
    },
  };
  const options = {
    tableName: "role",
    comment: "",
  };
  const RoleModel = sequelize.define("role", attributes, options);
  return RoleModel;
};