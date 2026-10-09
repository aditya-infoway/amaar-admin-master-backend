const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    salesDetailsId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "salesDetailsId",
    },

    salesId: { type: DataTypes.INTEGER, allowNull: false, field: "salesId" },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: "companyId" },

    itemId: { type: DataTypes.INTEGER, allowNull: false, field: "itemId" },
    itemCode: { type: DataTypes.STRING(100), allowNull: true, field: "itemCode" },
    itemDescription: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "itemDescription",
    },
    hsnCode: { type: DataTypes.STRING(50), allowNull: true, field: "hsnCode" },
    uom: { type: DataTypes.STRING(50), allowNull: true, field: "uom" },

    qty: { type: DataTypes.DECIMAL(15, 3), allowNull: false, defaultValue: 0, field: "qty" },
    basicPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "basicPrice",
    },

    // amount = qty × basicPrice (discount se pehle)
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: "amount" },
    discount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "discount",
    },
    // taxableAmount = amount − discount
    taxableAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "taxableAmount",
    },
    taxPct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: "taxPct" },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "taxAmount",
    },
    netAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "netAmount",
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
    delete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "delete" },
  };

  const options = {
    tableName: "salesdetails",
    comment: "",
    indexes: [{ fields: ["salesId"] }, { fields: ["companyId", "itemId"] }],
  };

  return sequelize.define("salesdetails", attributes, options);
};