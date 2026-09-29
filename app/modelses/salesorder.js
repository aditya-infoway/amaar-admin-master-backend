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

   
   accountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "accountId",
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