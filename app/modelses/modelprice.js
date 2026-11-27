const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const attributes = {
        modelPriceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            field: "modelPriceId",
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "companyId",
        },
        // Finished Goods = itemmaster.itemId that has at least one complete BOM
        finishedGoodsItemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "finishedGoodsItemId",
        },
        modelName: {
            type: DataTypes.STRING(150),
            allowNull: true,
            field: "modelName",
        },
        modelPriceNo: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: "modelPriceNo",
        },
        financialYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "financialYearId",
        },
        referenceModelPriceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "referenceModelPriceId",
        },
        effectiveDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: "effectiveDate",
        },
        currentDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: "currentDate",
        },
        totalValue: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true,
            defaultValue: 0,
            field: "totalValue",
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "active",
            field: "status",
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "createdBy",
        },
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
        delete: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "delete",
        },
    };

    const options = {
        tableName: "modelprice",
        comment: "Model Price header",
        indexes: [
            { fields: ["companyId"] },
            { fields: ["finishedGoodsItemId"] },
        ],
    };

    const ModelPrice = sequelize.define("modelPrice", attributes, options);
    return ModelPrice;
};
