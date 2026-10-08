const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
    const attributes = {
        employeeContractorTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            field: "employeeContractorTypeId",
        },
        companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
        employeeId: { type: DataTypes.INTEGER, allowNull: false, field: "employeeId" },
        contractorType: { type: DataTypes.STRING(50), allowNull: false, field: "contractorType" },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
    };
    const options = {
        tableName: "employeeContractorType",
        indexes: [{ unique: true, fields: ["employeeId", "contractorType"] }],
    };
    return sequelize.define("employeeContractorType", attributes, options);
};