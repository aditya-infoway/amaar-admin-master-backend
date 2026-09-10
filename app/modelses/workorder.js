const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    workOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "workOrderId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    financialYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "financialYearId",
    },

    workOrderNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "workOrderNo",
    },

    salesOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "salesOrderId",
    },

    customerName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: "customerName",
    },

    mobile: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "mobile",
    },

    email: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "email",
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "address",
    },

    city: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "city",
    },

    model: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "model",
    },

    qty: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 1,
      field: "qty",
    },

    totalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "totalPrice",
    },

    gst: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "gst",
    },

    grandTotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "grandTotal",
    },

    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "createdBy",
    },

    createdtype: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "createdtype",
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
    tableName: "workorder",

    comment: "",

    indexes: [
      { fields: ["companyId", "workOrderNo"] },
      { fields: ["companyId", "salesOrderId"] },
      { fields: ["companyId", "financialYearId"] },
    ],
  };

  const WorkOrderModel = sequelize.define(
    "workorder",
    attributes,
    options
  );

  return WorkOrderModel;
};