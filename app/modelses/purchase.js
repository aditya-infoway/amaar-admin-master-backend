const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    purchaseId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    financialYearId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    terms: { type: DataTypes.STRING(20), allowNull: false }, // Credit, Cash, Bank
    accountId: { type: DataTypes.INTEGER, allowNull: false }, // Supplier/Party
    branchId: { type: DataTypes.INTEGER, allowNull: true },
    billNo: { type: DataTypes.STRING(50), allowNull: false },
    purchaseBillNo: { type: DataTypes.STRING(50), allowNull: false },
    purchaseDate: { type: DataTypes.DATEONLY, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    narration: { type: DataTypes.TEXT, allowNull: true },

    // ---- Charges ----
    transportCharge: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    loadingCharge: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    otherCharge: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    discountPct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    roundAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },

    // ---- Totals ----
    taxableValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    gstAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    cgstAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    sgstAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    igstAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    grandTotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },

    // ---- Payment (Cash/Bank) ----
    cashAccountId: { type: DataTypes.INTEGER, allowNull: true },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true },
    paymentMode: { type: DataTypes.STRING(20), allowNull: true }, // UPI/NEFT/RTGS/IMPS/CHEQUE/CARD
    chequeNo: { type: DataTypes.STRING(50), allowNull: true },
    chequeDate: { type: DataTypes.DATEONLY, allowNull: true },
    chequeClearDate: { type: DataTypes.DATEONLY, allowNull: true },
    bankNarration: { type: DataTypes.TEXT, allowNull: true },

    billStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
    delete: { type: DataTypes.INTEGER, defaultValue: 0 },
  };
  const options = {
    tableName: "purchase",
    comment: "",
    indexes: [
      { unique: true, fields: ["companyId", "financialYearId", "purchaseBillNo"] },
    ],
  };
  return sequelize.define("purchase", attributes, options);
};