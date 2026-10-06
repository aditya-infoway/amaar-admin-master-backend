const { DataTypes } = require('sequelize');
module.exports = sequelize => {
    const attributes = {
        id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true, field: "id" },
        companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
        groupId: { type: DataTypes.INTEGER, allowNull: false, field: "groupId" },
        groupName: { type: DataTypes.STRING(150), allowNull: false, field: "groupName" },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active", field: "status" },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
    };
    const options = {
        tableName: "accountgroup",
        comment: "",
        indexes: [{ fields: ["companyId", "groupId"] }],
    };
    return sequelize.define("accountgroup", attributes, options);
};