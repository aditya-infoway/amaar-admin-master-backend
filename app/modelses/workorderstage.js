module.exports = (sequelize, DataTypes) => {
    const WorkOrderStage = sequelize.define(
        "workorderstage",
        {
            workOrderStageId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            companyId: { type: DataTypes.INTEGER, allowNull: false },
            workOrderId: { type: DataTypes.INTEGER, allowNull: false },
            stage: { type: DataTypes.STRING(30), allowNull: false },
            stageOrder: { type: DataTypes.INTEGER, allowNull: false },
            employeeId: { type: DataTypes.INTEGER, allowNull: false },
            status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Pending" },
            completedAt: { type: DataTypes.DATE },
            startTime: { type: DataTypes.DATE },
            endTime: { type: DataTypes.DATE },
            itemsVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            itemsVerifiedAt: { type: DataTypes.DATE },
            delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
            updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { tableName: "workorderstage", timestamps: false, freezeTableName: true },
    );
    return WorkOrderStage;
};