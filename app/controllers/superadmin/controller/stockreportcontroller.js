const {
  successResponse,
  errorResponse,
  requiredmessage,
  selectWithJoins,
  selectWithJoinsV2,
} = require("../../../helper/index.js");

// ---------------- STOCK REPORT LIST ----------------
const getStockReportList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    // ---------------------------------------------------------
    // ALL ITEM MASTER ITEMS
    // ---------------------------------------------------------
    const items = await selectWithJoins(
      "itemmaster",
      [],
      {
        companyId,
        delete: 0,
      },
      [
        "itemId",
        "itemCode",
        "itemName",
        "hsnCode",
        "unit",
        "itemCategoryId",
        "groupId",
        "taxSlab",
        "openingStock",
        "stockValue",
      ],
    );

    // ---------------------------------------------------------
    // VERIFIED PURCHASE STOCK
    // ---------------------------------------------------------
    const details = await selectWithJoins(
      "purchasedetails",
      [],
      {
        companyId,
        verified: true,
        delete: 0,
      },
      ["itemId", "currentStock"],
    );

    // ---------------------------------------------------------
    // ITEM-WISE PURCHASE CURRENT STOCK
    // ---------------------------------------------------------
    const stockMap = {};

    details.forEach((d) => {
      const qty = Number(d.currentStock) || 0;

      stockMap[d.itemId] =
        (stockMap[d.itemId] || 0) + qty;
    });

    // ---------------------------------------------------------
    // CATEGORY MAP
    // ---------------------------------------------------------
    const categoryIds = [
      ...new Set(
        items
          .map((i) => i.itemCategoryId)
          .filter(Boolean)
      ),
    ];

    let categoryMap = {};

    if (categoryIds.length) {
      const categories = await selectWithJoins(
        "itemcategory",
        [],
        {
          itemCategoryId: categoryIds,
          companyId,
          delete: 0,
        },
        [
          "itemCategoryId",
          "categoryName",
        ],
      );

      categories.forEach((c) => {
        categoryMap[c.itemCategoryId] = c.categoryName;
      });
    }

    // ---------------------------------------------------------
    // GROUP MAP
    // ---------------------------------------------------------
    const groupIds = [
      ...new Set(
        items
          .map((i) => i.groupId)
          .filter(Boolean)
      ),
    ];

    let groupMap = {};

    if (groupIds.length) {
      const groups = await selectWithJoins(
        "itemgroup",
        [],
        {
          itemGroupId: groupIds,
          companyId,
          delete: 0,
        },
        [
          "itemGroupId",
          "groupName",
        ],
      );

      groups.forEach((g) => {
        groupMap[g.itemGroupId] = g.groupName;
      });
    }

    // ---------------------------------------------------------
    // FINAL STOCK REPORT DATA
    // ---------------------------------------------------------
   // FINAL STOCK REPORT DATA
const data = items.map((item) => {
  // Opening stock from Item Master
  const openingStock = Number(item.openingStock) || 0;

  // Purchase stock from Purchase Details
  const purchaseStock = Number(stockMap[item.itemId]) || 0;

  // Final current stock
  const currentStock = openingStock + purchaseStock;

  return {
    id: String(item.itemId),

    itemCode: item.itemCode || "",
    itemName: item.itemName || "",
    hsnCode: item.hsnCode || "",
    unit: item.unit || "",

    categoryName:
      categoryMap[item.itemCategoryId] || "",

    groupName:
      groupMap[item.groupId] || "",

    taxSlab:
      String(item.taxSlab ?? "0"),

    // Item Master
    openingStock: String(openingStock),

    stockValue:
      String(item.stockValue ?? "0"),

    // Opening Stock + Purchase Stock
    currentStock:
      String(currentStock),
  };
});

    return successResponse(
      res,
      data,
      "Stock report fetched successfully"
    );

  } catch (error) {
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error
    );
  }
};


// ---------------- STOCK REPORT DETAILS ----------------
// ---------------- STOCK REPORT DETAILS ----------------
const getStockReportDetails = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { itemId } = req.params;

    // ---------------------------------------------------------
    // 1. ITEM MASTER + CATEGORY + GROUP
    // ---------------------------------------------------------
    const itemRows = await selectWithJoinsV2(
      "itemmaster",
      [
        {
          table: "itemcategory",
          alias: "ic",
          onClause: {
            'ic."itemCategoryId"': {
              "=": 'itemmaster."itemCategoryId"',
            },
          },
        },
        {
          table: "itemgroup",
          alias: "ig",
          onClause: {
            'ig."itemGroupId"': {
              "=": 'itemmaster."groupId"',
            },
          },
        },
      ],
      {
        'itemmaster."itemId"': itemId,
        'itemmaster."companyId"': companyId,
        'itemmaster."delete"': 0,
      },
      [
        'itemmaster."itemId"',
        'itemmaster."itemCode"',
        'itemmaster."itemName"',
        'itemmaster."hsnCode"',
        'itemmaster."unit"',
        'itemmaster."openingStock"',
        'itemmaster."stockValue"',
        'ic."categoryName" AS "categoryName"',
        'ig."groupName" AS "groupName"',
      ],
      [],
      1,
      0
    );

    if (itemRows.length === 0) {
      return requiredmessage(res, "Item not found.");
    }

    const item = itemRows[0];
    const openingStock = Number(item.openingStock) || 0;
    const stockValue = Number(item.stockValue) || 0;

    // ---------------------------------------------------------
    // 2. ALL VERIFIED PURCHASE DETAILS
    // ---------------------------------------------------------
    const purchaseDetails = await selectWithJoins(
      "purchasedetails",
      [],
      {
        itemId,
        companyId,
        verified: true,
        delete: 0,
      },
      [
        "purchaseDetailsId",
        "purchaseId",
        "qty",
        "rate",
        "total",
        "currentStock",
        "created",
      ]
    );

    // ---------------------------------------------------------
    // 3. PURCHASE HEADER MAP
    // ---------------------------------------------------------
    const purchaseIds = [
      ...new Set(purchaseDetails.map((d) => d.purchaseId).filter(Boolean)),
    ];

    let purchaseMap = {};
    if (purchaseIds.length) {
      const purchases = await selectWithJoins(
        "purchase",
        [],
        {
          purchaseId: purchaseIds,
          companyId,
          delete: 0,
        },
        ["purchaseId", "purchaseBillNo", "purchaseDate", "accountId"]
      );

      purchases.forEach((p) => {
        purchaseMap[p.purchaseId] = p;
      });
    }

    // ---------------------------------------------------------
    // 4. CURRENT STOCK + AVG PURCHASE PRICE
    // ---------------------------------------------------------
    let totalPurchaseQty = 0;
    let totalPurchaseValue = 0;

    purchaseDetails.forEach((d) => {
      const qty = Number(d.qty) || 0;
      const rate = Number(d.rate) || 0;
      totalPurchaseQty += qty;
      totalPurchaseValue += qty * rate;
    });

    const currentStock = openingStock + totalPurchaseQty;

    // Average purchase price from verified purchases
    let purchasePrice = 0;
    if (totalPurchaseQty > 0) {
      purchasePrice = totalPurchaseValue / totalPurchaseQty;
    }

    // ---------------------------------------------------------
    // 5. HISTORY ROWS
    // ---------------------------------------------------------
    const rows = [];

    // Opening entry (always first)
    // qty     = openingStock
    // balance = stockValue
    rows.push({
      id: "opening",
      date: "",
      type: "Opening",
      qty: String(openingStock),
      balance: String(stockValue),
    });

    // Running quantity balance
    let runningQtyBalance = openingStock;

    // Sort purchases oldest → newest
    const sortedPurchases = [...purchaseDetails].sort((a, b) => {
      const dateA = purchaseMap[a.purchaseId]?.purchaseDate || "";
      const dateB = purchaseMap[b.purchaseId]?.purchaseDate || "";
      return dateA.localeCompare(dateB);
    });

    sortedPurchases.forEach((d) => {
      const purchase = purchaseMap[d.purchaseId] || {};
      const qty = Number(d.qty) || 0;

      runningQtyBalance += qty;

      rows.push({
        id: String(d.purchaseDetailsId),
        date: purchase.purchaseDate || "",
        type: "Purchase",
        qty: String(qty),
        balance: String(runningQtyBalance),
      });
    });

    // ---------------------------------------------------------
    // 6. FINAL RESPONSE
    // ---------------------------------------------------------
    return successResponse(
      res,
      {
        itemId: String(item.itemId),
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",

        // Cards
        currentStock: String(currentStock),
        purchasePrice: purchasePrice.toFixed(2),
        unit: item.unit || "",

        // Item Details
        hsnCode: item.hsnCode || "",
        brand: "",                         // no brand column → empty
        category: item.categoryName || "",
        group: item.groupName || "",

        // History
        rows,
      },
      "Stock report details fetched successfully"
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error
    );
  }
};


module.exports = {
  getStockReportList,
  getStockReportDetails,
};