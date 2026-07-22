const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const attributes = {
    vehicleEntryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "vehicleEntryId"
    },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },
    entryDate: { type: DataTypes.STRING(20), allowNull: false, field: "entryDate" },
    entryTime: { type: DataTypes.STRING(20), allowNull: false, field: "entryTime" },
    vehicleType: { type: DataTypes.STRING(50), allowNull: false, field: "vehicleType" },
    vehicleNumber: { type: DataTypes.STRING(30), allowNull: false, field: "vehicleNumber" },
    vehicleBrand: { type: DataTypes.STRING(50), allowNull: true, field: "vehicleBrand" },
    driverName: { type: DataTypes.STRING(100), allowNull: false, field: "driverName" },
    mobileNumber: { type: DataTypes.STRING(15), allowNull: false, field: "mobileNumber" },
    company: { type: DataTypes.STRING(100), allowNull: true, field: "company" },
    purpose: { type: DataTypes.STRING(150), allowNull: false, field: "purpose" },
    employeeToMeet: { type: DataTypes.STRING(100), allowNull: true, field: "employeeToMeet" },
    gateNumber: { type: DataTypes.STRING(20), allowNull: true, field: "gateNumber" },
    vehicleCondition: { type: DataTypes.STRING(50), allowNull: true, field: "vehicleCondition" },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "IN", field: "status" },

    // Documents (entry time)
    driverPhoto: { type: DataTypes.STRING(255), allowNull: true, field: "driverPhoto" },
    rcPhoto: { type: DataTypes.STRING(255), allowNull: true, field: "rcPhoto" },
    vehiclePhotoFront: { type: DataTypes.STRING(255), allowNull: true, field: "vehiclePhotoFront" },
    vehiclePhotoBack: { type: DataTypes.STRING(255), allowNull: true, field: "vehiclePhotoBack" },

    // Exit details
    exitTime: { type: DataTypes.STRING(20), allowNull: true, field: "exitTime" },
    exitVehicleCondition: { type: DataTypes.STRING(50), allowNull: true, field: "exitVehicleCondition" },
    conditionChangedAtExit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "conditionChangedAtExit" },
    exitPhotoFront: { type: DataTypes.STRING(255), allowNull: true, field: "exitPhotoFront" },
    exitPhotoBack: { type: DataTypes.STRING(255), allowNull: true, field: "exitPhotoBack" },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "createdBy"
    },
    createdType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "createdType"
    },

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };
  const options = {
    tableName: "vehicleentry",
    comment: "",
    indexes: [
      { fields: ["companyId"] },
      { fields: ["vehicleNumber"] },
    ]
  };
  const VehicleEntry = sequelize.define("vehicleentry", attributes, options);
  return VehicleEntry;
};