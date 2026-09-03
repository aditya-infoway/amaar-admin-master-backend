const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    salesOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "salesOrderId",
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

    soNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "soNo",
    },

    quotationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "quotationId",
    },

    leadId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "leadId",
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

    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "remark",
    },

    mode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "asIs",
      field: "mode",
    },

    qty: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 1,
      field: "qty",
    },

    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "unitPrice",
    },

    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "totalAmount",
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

    gstNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "gstNumber",
    },

    gstImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "gstImage",
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
    tableName: "salesorder",

    comment: "",

    indexes: [
      {
        fields: ["companyId", "soNo"],
      },
      {
        fields: ["companyId", "quotationId"],
      },
      {
        fields: ["companyId", "leadId"],
      },
      {
        fields: ["companyId", "financialYearId"],
      },
    ],
  };

  const SalesOrderModel = sequelize.define(
    "salesorder",
    attributes,
    options
  );

  return SalesOrderModel;
};