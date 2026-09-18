const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    attendanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "attendanceId"
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId"
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "employeeId"
    },
    employeeName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "employeeName"
    },
 checkinDate: { type: DataTypes.DATEONLY, allowNull: true, field: "checkinDate" },
    checkinTime: { type: DataTypes.DATE, allowNull: true, field: "checkinTime" },
    checkinPhoto: { type: DataTypes.TEXT, allowNull: true, field: "checkinPhoto" },
    checkinLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "checkinLatitude" },
    checkinLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "checkinLongitude" },
 lastCheckinTime: { type: DataTypes.DATE, allowNull: true, field: "lastCheckinTime" },

   
    isCheckedIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "isCheckedIn" },
    checkoutTime: { type: DataTypes.DATE, allowNull: true, field: "checkoutTime" },
    checkoutPhoto: { type: DataTypes.TEXT, allowNull: true, field: "checkoutPhoto" },
    checkoutLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "checkoutLatitude" },
    checkoutLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "checkoutLongitude" },

    // seconds — checkout hone par checkinTime se calculate hoga
       countTime: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0, field: "countTime" },

    // abhi use nahi hoga, sirf column ready
    status: { type: DataTypes.STRING(20), allowNull: true, field: "status" },

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "attendance",
    comment: "",
    indexes: []
  };
  const AttendanceModel = sequelize.define("attendance", attributes, options);
  return AttendanceModel;
};