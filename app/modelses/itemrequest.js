const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    itemRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "itemRequestId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    financialYearId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "financialYearId",
    },

    workOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "workOrderId",
    },

    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "requestedBy", // employeeId of the contractor
    },

    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Pending",
      field: "status", // Pending / Approved / Rejected / Issued
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "remarks",
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
    tableName: "itemrequest",
    comment: "",
    indexes: [
      { fields: ["companyId", "workOrderId"] },
      { fields: ["companyId", "requestedBy"] },
      { fields: ["companyId", "status"] },
    ],
  };

  const ItemRequestModel = sequelize.define(
    "itemrequest",
    attributes,
    options
  );

  return ItemRequestModel;
};