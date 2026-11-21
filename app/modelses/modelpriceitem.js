const { DataTypes } = require("sequelize");

// ---------------------------------------------------------------------------
// Lines of a Model Price.
// itemId        → createmaster.createMasterId  (always from Create Master)
// type          → 'BOM' | 'Manual' | 'Quotation'
// groupId       → itemgroup.itemGroupId        (only for BOM)
// subGroupId    → subgroup.subGroupId          (only for BOM, optional)
// weight / rate / value stored as strings (same pattern as bomitem)
// ---------------------------------------------------------------------------

module.exports = (sequelize) => {
    const attributes = {
        modelPriceItemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            field: "modelPriceItemId",
        },
        modelPriceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "modelPriceId",
        },

        // Always points to createmaster.createMasterId
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "itemId",
        },

        type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: "type", // BOM | Manual | Quotation
        },

        // Only used when type = BOM
        groupId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "groupId",
        },
        subGroupId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "subGroupId",
        },

        weight: {
            type: DataTypes.STRING(30),
            allowNull: true,
            field: "weight",
        },
        rate: {
            type: DataTypes.STRING(30),
            allowNull: true,
            field: "rate",
        },
        value: {
            type: DataTypes.STRING(30),
            allowNull: true,
            field: "value",
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
        tableName: "modelpriceitem",
        comment: "Model Price line items",
        indexes: [
            { fields: ["modelPriceId"] },
            { fields: ["itemId"] },
            { fields: ["type"] },
        ],
    };

    const ModelPriceItem = sequelize.define("modelPriceItem", attributes, options);
    return ModelPriceItem;
};
