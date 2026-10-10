const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
    const attributes = {
        bodyRegisterId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true, field: "bodyRegisterId" },
        companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
        workOrderId: { type: DataTypes.INTEGER, allowNull: false, field: "workOrderId" },
        vehicleType: { type: DataTypes.STRING(20), allowNull: true, field: "vehicleType" },
        classOfVehicle: { type: DataTypes.STRING(255), allowNull: true, field: "classOfVehicle" },
        makerName: { type: DataTypes.STRING(255), allowNull: true, field: "makerName" },
        bodyNumber: { type: DataTypes.STRING(30), allowNull: true, field: "bodyNumber" },
        serialNo: { type: DataTypes.INTEGER, allowNull: true, field: "serialNo" },
        bodyYear: { type: DataTypes.INTEGER, allowNull: true, field: "bodyYear" },
        engineNo: { type: DataTypes.STRING(100), allowNull: true, field: "engineNo" },
        noOfCylinder: { type: DataTypes.STRING(20), allowNull: true, field: "noOfCylinder" },
        fuelUsed: { type: DataTypes.STRING(50), allowNull: true, field: "fuelUsed" },
        mfgMonthYear: { type: DataTypes.STRING(20), allowNull: true, field: "mfgMonthYear" },
        bodyColour: { type: DataTypes.STRING(50), allowNull: true, field: "bodyColour" },
        grossVehicleWeight: { type: DataTypes.STRING(30), allowNull: true, field: "grossVehicleWeight" },
        typeOfBody: { type: DataTypes.STRING(255), allowNull: true, field: "typeOfBody" },
        createdBy: { type: DataTypes.STRING(50), allowNull: true, field: "createdBy" },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
    };
    const options = { tableName: "bodyregister", comment: "", indexes: [] };
    return sequelize.define("bodyregister", attributes, options);
};