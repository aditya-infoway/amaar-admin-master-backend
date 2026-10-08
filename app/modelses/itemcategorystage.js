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
            type: DataTypes.STRING(50), // abhi sirf "cutting"
            allowNull: false,
            field: "stage",
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
            { fields: ["companyId", "categoryId"] },
        ],
    };

    return sequelize.define("itemcategorystage", attributes, options);
};