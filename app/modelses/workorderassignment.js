module.exports = (sequelize, DataTypes) => {
    const WorkOrderAssignment = sequelize.define(
        "workorderassignment",
        {
            workOrderAssignmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            companyId: { type: DataTypes.INTEGER, allowNull: false },
            workOrderId: { type: DataTypes.INTEGER, allowNull: false },
            processId: { type: DataTypes.INTEGER, allowNull: false },
            subProcessId: { type: DataTypes.INTEGER, allowNull: true },
            contractorId: { type: DataTypes.INTEGER, allowNull: false },
            contractAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Pending" },
            startTime: { type: DataTypes.DATE },
            endTime: { type: DataTypes.DATE },
            itemsVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            itemsVerifiedAt: { type: DataTypes.DATE },
            delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
            updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { tableName: "workorderassignment", timestamps: false, freezeTableName: true },
    );
    return WorkOrderAssignment;
};