// models/debitnote.js
const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
    const attributes = {
        debitNoteId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        companyId: { type: DataTypes.INTEGER, allowNull: false },
        financialYearId: { type: DataTypes.INTEGER, allowNull: false },
        debitNoteNo: { type: DataTypes.STRING(50), allowNull: false },
        debitNoteDate: { type: DataTypes.DATEONLY, allowNull: false },

        // what the debit note was raised on
        sourceType: { type: DataTypes.STRING(10), allowNull: false }, // GRR | QC
        grrId: { type: DataTypes.INTEGER, allowNull: false },
        qcId: { type: DataTypes.INTEGER, allowNull: true }, // only when sourceType = QC
        purchaseOrderId: { type: DataTypes.INTEGER, allowNull: true },
        supplierId: { type: DataTypes.INTEGER, allowNull: false },

        paymentType: { type: DataTypes.STRING(20), allowNull: false }, // Credit | Cash | Bank
        refundAccountId: { type: DataTypes.INTEGER, allowNull: true }, // cash / bank account

        taxableValue: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        gstAmount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        grandTotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        remarks: { type: DataTypes.TEXT, allowNull: true },

        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "Completed",
        },
        createdBy: { type: DataTypes.INTEGER, allowNull: true },
        createdType: { type: DataTypes.STRING(20), allowNull: true },
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
        delete: { type: DataTypes.INTEGER, defaultValue: 0 },
    };
    const options = {
        tableName: "debitnote",
        comment: "",
        indexes: [
            {
                unique: true,
                fields: ["companyId", "financialYearId", "debitNoteNo"],
            },
        ],
    };
    return sequelize.define("debitnote", attributes, options);
};