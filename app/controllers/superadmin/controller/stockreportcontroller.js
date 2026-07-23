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
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    // ---- Sirf verified purchase detail rows hi stock me count honge ----
    const details = await selectWithJoins(
      "purchasedetails",
      [],
      { companyId, verified: true, delete: 0 },
      ["itemId", "currentStock"],
    );

    // ---- Item-wise currentStock ka sum ----
    const stockMap = {};
    details.forEach((d) => {
      const qty = Number(d.currentStock) || 0;
      stockMap[d.itemId] = (stockMap[d.itemId] || 0) + qty;
    });

    const itemIds = Object.keys(stockMap)
      .map((id) => Number(id))
      .filter((id) => stockMap[id] > 0);

    if (itemIds.length === 0) {
      return successResponse(res, [], "Stock report fetched successfully");
    }

    // ✅ CHANGED — array filter (IN clause) selectWithJoinsV2 me support nahi hota,
    // isliye selectWithJoins use kiya (jo array value ko IN clause bana deta hai)
    const items = await selectWithJoins(
      "itemmaster",
      [],
      { itemId: itemIds, companyId, delete: 0 },
      ["itemId", "itemCode", "itemName", "hsnCode", "unit", "itemCategoryId", "groupId", "purchasePrice", "salesPrice", "taxSlab"],
    );

    // ---- Category names — alag lookup + map (selectWithJoinsV2 ki jagah) ----
    const categoryIds = [...new Set(items.map((i) => i.itemCategoryId).filter(Boolean))];
    let categoryMap = {};
    if (categoryIds.length) {
      const categories = await selectWithJoins(
        "itemcategory", [], { itemCategoryId: categoryIds, companyId, delete: 0 }, ["itemCategoryId", "categoryName"],
      );
      categories.forEach((c) => { categoryMap[c.itemCategoryId] = c.categoryName; });
    }

    // ---- Group names — alag lookup + map ----
    const groupIds = [...new Set(items.map((i) => i.groupId).filter(Boolean))];
    let groupMap = {};
    if (groupIds.length) {
      const groups = await selectWithJoins(
        "itemgroup", [], { itemGroupId: groupIds, companyId, delete: 0 }, ["itemGroupId", "groupName"],
      );
      groups.forEach((g) => { groupMap[g.itemGroupId] = g.groupName; });
    }

    const data = items.map((item) => ({
      id: String(item.itemId),
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      hsnCode: item.hsnCode || "",
      unit: item.unit || "",
      categoryName: categoryMap[item.itemCategoryId] || "",
      groupName: groupMap[item.groupId] || "",
      purchasePrice: String(item.purchasePrice ?? "0"),
      salesPrice: String(item.salesPrice ?? "0"),
      taxSlab: String(item.taxSlab ?? "0"),
      currentStock: String(stockMap[item.itemId] || 0),
    }));

    return successResponse(res, data, "Stock report fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- STOCK REPORT DETAILS (item ki purchase history) ----------------
const getStockReportDetails = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId } = req.params;

    // ---- itemId se hi itemCode/itemName + category/group left join ----
    const itemRows = await selectWithJoinsV2(
      "itemmaster",
      [
        {
          table: "itemcategory",
          alias: "ic",
          onClause: { 'ic."itemCategoryId"': { "=": 'itemmaster."itemCategoryId"' } },
        },
        {
          table: "itemgroup",
          alias: "ig",
          onClause: { 'ig."itemGroupId"': { "=": 'itemmaster."groupId"' } },
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
        'ic."categoryName" AS "categoryName"',
        'ig."groupName" AS "groupName"',
      ],
      [],
      1,
      0
    );

    if (itemRows.length === 0) return requiredmessage(res, "Item not found.");
    const item = itemRows[0];

    // ---- Verified rows hi, aur jinme stock abhi bhi bacha ho ----
    const details = await selectWithJoins(
      "purchasedetails",
      [],
      { itemId, companyId, verified: true, delete: 0 },
      ["purchaseDetailsId", "purchaseId", "qty", "rate", "total", "currentStock", "created"],
    );

    // ✅ current stock 0 ho gaya ho to wo row list me show nahi hogi
    const remainingDetails = details.filter((d) => Number(d.currentStock) > 0);

    const purchaseIds = [...new Set(remainingDetails.map((d) => d.purchaseId))];
    let purchaseMap = {};
    if (purchaseIds.length) {
      const purchases = await selectWithJoins(
        "purchase", [], { purchaseId: purchaseIds, companyId, delete: 0 },
        ["purchaseId", "purchaseBillNo", "purchaseDate", "accountId"],
      );
      purchases.forEach((p) => { purchaseMap[p.purchaseId] = p; });
    }

    const accountIds = [...new Set(Object.values(purchaseMap).map((p) => p.accountId).filter(Boolean))];
    let accountMap = {};
    if (accountIds.length) {
      const accounts = await selectWithJoins(
        "account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"],
      );
      accounts.forEach((a) => { accountMap[a.id] = a; });
    }

    const rows = remainingDetails.map((d) => {
      const purchase = purchaseMap[d.purchaseId] || {};
      const account = accountMap[purchase.accountId] || {};
      return {
        id: String(d.purchaseDetailsId),
        date: purchase.purchaseDate || "",
        partyName: account.accountName || "",
        billNo: purchase.purchaseBillNo || "",
        qty: String(d.qty),
        billAmount: String(d.total),
        currentStock: String(d.currentStock),
      };
    });

    return successResponse(
      res,
      {
        itemId: String(item.itemId),
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        hsnCode: item.hsnCode || "",
        unit: item.unit || "",
        categoryName: item.categoryName || "",
        groupName: item.groupName || "",
        rows,
      },
      "Stock report details fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = { getStockReportList, getStockReportDetails };