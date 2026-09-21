const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    contractorEmployeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "contractorEmployeeId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    // account.id of a Sundry Creditor account
    partyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "partyId",
    },

    employeeName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "employeeName",
    },

    employeeNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "employeeNo",
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "email",
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "address",
    },

    aadharNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "aadharNumber",
    },

    aadharImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "aadharImage",
    },

    panNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "panNumber",
    },

    panImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "panImage",
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
    tableName: "contractoremployee",

    comment: "",

    indexes: [
      {
        fields: ["companyId", "employeeNo"],
      },
      {
        fields: ["companyId", "partyId"],
      },
    ],
  };

  const ContractorEmployeeModel = sequelize.define(
    "contractoremployee",
    attributes,
    options
  );

  return ContractorEmployeeModel;
};