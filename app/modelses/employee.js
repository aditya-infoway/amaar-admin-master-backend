const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "employeeId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    department: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "department"
    },
    branch: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "0",
      field: "branch"
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "roleId"
    },
    employeeName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "employeeName"
    },
    mobileNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      field: "mobileNumber"
    },
    alternateNumber: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: "alternateNumber"
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "email"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password"
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "token"
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
      field: "status"
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "createdBy"
    },
    createdType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "createdType"
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
    tableName: "employee",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "mobileNumber"] },
      { unique: true, fields: ["companyId", "email"] },
    ]
  };
  const EmployeeModel = sequelize.define("employee", attributes, options);
  return EmployeeModel;
};