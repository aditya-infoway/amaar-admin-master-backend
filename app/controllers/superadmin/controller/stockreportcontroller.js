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
      "purchasedetails", [],
      { companyId, delete: 0 },
      ["itemId", "qty"],
    );

    // 2. itemId ke hisaab se sab qty sum karo — chahe wo item kisi bhi category/group ka ho
    const stockMap = {};
    details.forEach((d) => {
      const qty = Number(d.qty) || 0;
      stockMap[d.itemId] = (stockMap[d.itemId] || 0) + qty;   // ✅ per-itemId aggregation
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
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId } = req.params;

    const itemRows = await selectWithJoinsV2(
      "itemmaster",
      [
        { table: "itemcategory", alias: "ic", onClause: { 'ic."itemCategoryId"': { "=": 'itemmaster."itemCategoryId"' } } },
        { table: "itemgroup", alias: "ig", onClause: { 'ig."itemGroupId"': { "=": 'itemmaster."groupId"' } } },
      ],
      { 'itemmaster."itemId"': itemId, 'itemmaster."companyId"': companyId, 'itemmaster."delete"': 0 },
      [
        'itemmaster."itemId"', 'itemmaster."itemCode"', 'itemmaster."itemName"',
        'itemmaster."hsnCode"', 'itemmaster."unit"', 'itemmaster."openingStock"',
        'itemmaster."stockValue"', 'ic."categoryName" AS "categoryName"', 'ig."groupName" AS "groupName"',
      ],
      [], 1, 0
    );

    if (itemRows.length === 0) return requiredmessage(res, "Item not found.");
    const item = itemRows[0];
    const openingStock = Number(item.openingStock) || 0;
    const stockValue = Number(item.stockValue) || 0;

    // ---- Purchase details (verified filter hataya) ----
    const purchaseDetails = await selectWithJoins(
      "purchasedetails", [],
      { itemId, companyId, delete: 0 },   // ✅ verified: true hataya
      ["purchaseDetailsId", "purchaseId", "qty", "rate", "total", "created"]
    );

    // ---- Purchase headers (billNo, date, accountId) ----
    const purchaseIds = [...new Set(purchaseDetails.map((d) => d.purchaseId).filter(Boolean))];
    let purchaseMap = {};
    if (purchaseIds.length) {
      const purchases = await selectWithJoins(
        "purchase", [], { purchaseId: purchaseIds, companyId, delete: 0 },
        ["purchaseId", "purchaseBillNo", "purchaseDate", "accountId"]
      );
      purchases.forEach((p) => { purchaseMap[p.purchaseId] = p; });
    }

    // ---- Party names (batch fetch) ----
    const accountIds = [...new Set(Object.values(purchaseMap).map((p) => p.accountId).filter(Boolean))];
    let accountMap = {};
    if (accountIds.length) {
      const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
      accounts.forEach((a) => { accountMap[a.id] = a.accountName; });
    }

    let totalPurchaseQty = 0;
    let totalPurchaseValue = 0;
    purchaseDetails.forEach((d) => {
      const qty = Number(d.qty) || 0;
      const rate = Number(d.rate) || 0;
      totalPurchaseQty += qty;
      totalPurchaseValue += qty * rate;
    });

    const currentStock = openingStock + totalPurchaseQty;
    const purchasePrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : 0;

    // ---- History rows (running balance + party/bill info) ----
    const rows = [];
    rows.push({
      id: "opening", date: "", type: "Opening",
      partyName: "", billNo: "",
      qty: String(openingStock), billAmount: "",
      currentStock: String(openingStock),
    });

    let runningQtyBalance = openingStock;
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
        partyName: accountMap[purchase.accountId] || "",
        billNo: purchase.purchaseBillNo || "",
        qty: String(qty),
        billAmount: String(d.total ?? ""),
        currentStock: String(runningQtyBalance),
      });
    });

    return successResponse(res, {
      itemId: String(item.itemId), itemCode: item.itemCode || "", itemName: item.itemName || "",
      currentStock: String(currentStock), purchasePrice: purchasePrice.toFixed(2), unit: item.unit || "",
      hsnCode: item.hsnCode || "", brand: "", category: item.categoryName || "", group: item.groupName || "",
      rows,
    }, "Stock report details fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};


module.exports = {
  getStockReportList,
  getStockReportDetails,
};