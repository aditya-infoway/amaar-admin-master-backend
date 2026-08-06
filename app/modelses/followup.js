const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "id"
    },
    leadId: { type: DataTypes.INTEGER, allowNull: false, field: "leadId" },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },

    // Purchase ka expected date is project me lead table me hi nahi hai — is liye followup me bhi nahi rakha.
    nextScheduledDate: { type: DataTypes.DATE, allowNull: true, field: "nextScheduledDate" },
    callTime: { type: DataTypes.STRING(20), allowNull: true, field: "callTime" },
    callResponse: { type: DataTypes.STRING(50), allowNull: true, field: "callResponse" },
    discussion: { type: DataTypes.STRING(500), allowNull: true, field: "discussion" },

    followupCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "followupCount" },

    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "createdBy" },
    createdType: { type: DataTypes.STRING(50), allowNull: true, field: "createdType" },

    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  };

  const options = {
    tableName: "followup",
    comment: "",
    indexes: [
      { fields: ["leadId"] },
      { fields: ["companyId"] },
    ]
  };

  const FollowUp = sequelize.define("followup", attributes, options);
  return FollowUp;
};