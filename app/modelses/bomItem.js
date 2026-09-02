const { DataTypes } = require("sequelize");

// ---------------------------------------------------------------------------
// Self-referencing tree table. IMPORTANT: itemCode / itemName YAHAN STORE
// NAHI HOTE — sirf `itemId` (itemmaster.itemId ka reference) store hota hai.
// Display ke liye (list/tree) itemCode/itemName har baar itemmaster se
// live lookup karke liye jaate hain (controller me dekho).
//
// parentId null => root item, warna parentId us row ka `bomItemId` hoga
// jiske andar ye child add hua hai.
// ---------------------------------------------------------------------------

module.exports = (sequelize) => {
  const attributes = {
    bomItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: "bomItemId",
    },
    bomId: { type: DataTypes.INTEGER, allowNull: false, field: "bomId" },
    parentId: { type: DataTypes.INTEGER, allowNull: true, field: "parentId" }, // null => root

    // 👇 Ye hi asli reference hai — itemmaster.itemId. itemCode/itemName
    // is table me kabhi store nahi karna, sirf ye id.
    itemId: { type: DataTypes.INTEGER, allowNull: false, field: "itemId" },

    quantity: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "quantity",
    },
    unit: { type: DataTypes.STRING(20), allowNull: true, field: "unit" },

    serialNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "serialNo",
    },
    asslyQty: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "asslyQty",
    },
    ldDay: { type: DataTypes.STRING(20), allowNull: true, field: "ldDay" },
    psNo: { type: DataTypes.STRING(50), allowNull: true, field: "psNo" },
    rejPct: { type: DataTypes.STRING(20), allowNull: true, field: "rejPct" },
    pkgNo: { type: DataTypes.STRING(50), allowNull: true, field: "pkgNo" },
    mfgCd: { type: DataTypes.STRING(50), allowNull: true, field: "mfgCd" },
    modDate: { type: DataTypes.STRING(20), allowNull: true, field: "modDate" },
    person: { type: DataTypes.STRING(100), allowNull: true, field: "person" },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "active",
      field: "status",
    },
    dtlNo: { type: DataTypes.STRING(50), allowNull: true, field: "dtlNo" },

    shapeDim: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "shapeDim",
    },
    finQtty: { type: DataTypes.STRING(20), allowNull: true, field: "finQtty" },
    shape: { type: DataTypes.STRING(50), allowNull: true, field: "shape" },
    thickness: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "thickness",
    },

    length: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "length",
    },

    width: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "width",
    },

    weight: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "weight",
    },

    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sortOrder",
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
    tableName: "bomitem",
    comment:
      "BOM tree items (self-referencing via parentId, item referenced by itemId only)",
    indexes: [
      { fields: ["bomId"] },
      { fields: ["parentId"] },
      { fields: ["itemId"] },
    ],
  };

  const BomItem = sequelize.define("bomItem", attributes, options);
  return BomItem;
};
