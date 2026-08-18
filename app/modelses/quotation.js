const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    quotationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "quotationId",
    },

    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "companyId",
    },

    financialYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    qNo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "qNo",
    },

    leadId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "leadId",
    },

    customerName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: "customerName",
    },

    mobile: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "mobile",
    },

    email: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "email",
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "address",
    },

    city: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "city",
    },

    model: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "model",
    },

    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "remark",
    },

    vehicleType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "vehicleType",
    },

    trailer: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "trailer",
    },

    chassis: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "chassis",
    },

    body: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "body",
    },

    hydraulic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "hydraulic",
    },

    axle: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "axle",
    },

    suspension: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "suspension",
    },

    tyre: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "tyre",
    },

    rim: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "rim",
    },

    kingPin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "kingPin",
    },

    landingLeg: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "landingLeg",
    },

    brakeSystem: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "brakeSystem",
    },

    mudguard: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "mudguard",
    },

    color: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "color",
    },

    electricalTapes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "electricalTapes",
    },

    supdRupd: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "supdRupd",
    },

    box: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "box",
    },

    spareWheelCarrier: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "spareWheelCarrier",
    },

    warranty: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "warranty",
    },

    discountType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "amount",
      field: "discountType",
    },

    discountValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "discountValue",
    },

    basicCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "basicCost",
    },

    gstAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "gstAmount",
    },

    finalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "finalPrice",
    },

    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "position",
    },

    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "createdBy",
    },

    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    delete: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "delete",
    },
  };

  const options = {
    tableName: "quotation",

    comment: "",

    indexes: [
      {
        fields: ["companyId", "qNo"],
      },
      {
        fields: ["companyId", "leadId"],
      },
    ],
  };

  const QuotationModel = sequelize.define("quotation", attributes, options);

  return QuotationModel;
};
