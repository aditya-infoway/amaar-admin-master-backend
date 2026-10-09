const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    salesId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "salesId",
    },

    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },

    financialYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "financialYearId",
    },

    salesInvoiceNo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "salesInvoiceNo",
    },

    salesDate: { type: DataTypes.DATEONLY, allowNull: false, field: "salesDate" },

    terms: { type: DataTypes.STRING(20), allowNull: false, field: "terms" },

    salesOrderId: { type: DataTypes.INTEGER, allowNull: true, field: "salesOrderId" },

    accountId: { type: DataTypes.INTEGER, allowNull: false, field: "accountId" },

    branchId: { type: DataTypes.INTEGER, allowNull: true, field: "branchId" },

    dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: "dueDate" },

    narration: { type: DataTypes.TEXT, allowNull: true, field: "narration" },

    subTotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "subTotal",
    },
    taxableAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "taxableAmount",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "discountAmount",
    },
    cgstAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "cgstAmount",
    },
    sgstAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "sgstAmount",
    },
    igstAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "igstAmount",
    },
    grandTotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "grandTotal",
    },

    cashAccountId: { type: DataTypes.INTEGER, allowNull: true, field: "cashAccountId" },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: "bankAccountId" },
    paymentMode: { type: DataTypes.STRING(20), allowNull: true, field: "paymentMode" },
    chequeNo: { type: DataTypes.STRING(50), allowNull: true, field: "chequeNo" },
    chequeDate: { type: DataTypes.DATEONLY, allowNull: true, field: "chequeDate" },
    chequeClearDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "chequeClearDate",
    },
    bankNarration: { type: DataTypes.TEXT, allowNull: true, field: "bankNarration" },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "pending",
      field: "status",
    },

    createdBy: { type: DataTypes.STRING(100), allowNull: true, field: "createdBy" },
    createdtype: { type: DataTypes.STRING(100), allowNull: true, field: "createdtype" },

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
    tableName: "sales",
    comment: "",
    indexes: [
      { fields: ["companyId", "salesInvoiceNo"] },
      { fields: ["companyId", "salesOrderId"] },
      { fields: ["companyId", "accountId"] },
      { fields: ["companyId", "financialYearId"] },
    ],
  };

  return sequelize.define("sales", attributes, options);
};