const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const attributes = {
        itemCategoryStageId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            field: "itemCategoryStageId",
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
        stage: {
            type: DataTypes.STRING(50), // process name (display ke liye snapshot)
            allowNull: false,
            field: "stage",
        },
        processId: {
            type: DataTypes.INTEGER,
            allowNull: true, // purane records ke liye null
            field: "processId",
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "categoryId",
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
        tableName: "itemcategorystage",
        comment: "",
        indexes: [
            { fields: ["companyId", "financialYearId"] },
            { fields: ["companyId", "stage"] },
            { fields: ["companyId", "processId"] },
            { fields: ["companyId", "categoryId"] },
        ],
    };

    return sequelize.define("itemcategorystage", attributes, options);
};