// models/debitnoteitem.js
const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
    const attributes = {
        debitNoteItemId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        debitNoteId: { type: DataTypes.INTEGER, allowNull: false },
        companyId: { type: DataTypes.INTEGER, allowNull: false },
        itemId: { type: DataTypes.INTEGER, allowNull: false },
        itemCode: { type: DataTypes.STRING(100), allowNull: true },
        itemName: { type: DataTypes.STRING(255), allowNull: false },
        hsnCode: { type: DataTypes.STRING(50), allowNull: true },
        rate: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        qty: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        gstPct: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
        taxable: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        gstAmt: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        total: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        delete: { type: DataTypes.INTEGER, defaultValue: 0 },
    };
    const options = {
        tableName: "debitnoteitem",
        comment: "",
    };
    return sequelize.define("debitnoteitem", attributes, options);
};