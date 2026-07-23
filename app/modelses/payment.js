// modelses/payment.js
const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "paymentId"
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    financialYearId: { type: DataTypes.INTEGER, allowNull: false, field: "financialYearId" },

    // CASH PAYMENT | BANK PAYMENT | CASH RECEIPT | BANK RECEIPT | CONTRA | JOURNAL
    voucherType: { type: DataTypes.STRING(30), allowNull: false, field: "voucherType" },
    voucherNo: { type: DataTypes.STRING(50), allowNull: false, field: "voucherNo" },

    date: { type: DataTypes.DATEONLY, allowNull: false, field: "date" },

    // "self" side = jis account se paisa nikal/aa raha he (Cash / Bank)
    selfAccountId: { type: DataTypes.INTEGER, allowNull: false, field: "selfAccountId" },
    selfDrOrCr: { type: DataTypes.STRING(2), allowNull: false, field: "selfDrOrCr" },

    // "opp" side = party account (customer/supplier/other)
    accountId: { type: DataTypes.INTEGER, allowNull: false, field: "accountId" },
    accountDrOrCr: { type: DataTypes.STRING(2), allowNull: false, field: "accountDrOrCr" },

    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: "amount" },
    narration: { type: DataTypes.STRING(500), allowNull: true, field: "narration" },

    paymentMode: { type: DataTypes.STRING(20), allowNull: true, field: "paymentMode" }, // CASH / CHEQUE / ONLINE
    chequeNo: { type: DataTypes.STRING(30), allowNull: true, field: "chequeNo" },
    chequeDate: { type: DataTypes.DATEONLY, allowNull: true, field: "chequeDate" },
    chequeClearDate: { type: DataTypes.DATEONLY, allowNull: true, field: "chequeClearDate" },
    bankNarration: { type: DataTypes.STRING(255), allowNull: true, field: "bankNarration" },

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

    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active", field: "status" },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "payment",
    comment: "",
    indexes: [
      { fields: ["companyId", "financialYearId", "voucherType"] },
      { unique: true, fields: ["companyId", "financialYearId", "voucherType", "voucherNo"] },
    ]
  };
  return sequelize.define("payment", attributes, options);
};