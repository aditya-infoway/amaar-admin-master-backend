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
    // ✅ NEW — ISSUED STOCK (itemissue table se)
    // ---------------------------------------------------------
    const issueRows = await selectWithJoins(
      "itemissue", [],
      { companyId, delete: 0 },
      ["itemId", "qty"],
    );
    const issuedMap = {};
    issueRows.forEach((d) => {
      const qty = Number(d.qty) || 0;
      issuedMap[d.itemId] = (issuedMap[d.itemId] || 0) + qty;
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
    const data = items.map((item) => {
      // Opening stock from Item Master
      const openingStock = Number(item.openingStock) || 0;

      // Purchase stock from Purchase Details
      const purchaseStock = Number(stockMap[item.itemId]) || 0;

      // ✅ Issued stock from Item Issue
      const issuedStock = Number(issuedMap[item.itemId]) || 0;

      // Final current stock = Opening + Purchase - Issued
      const currentStock = openingStock + purchaseStock - issuedStock;

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

        // Opening Stock + Purchase Stock - Issued Stock
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

    // ---- Purchase details ----
    const purchaseDetails = await selectWithJoins(
      "purchasedetails", [],
      { itemId, companyId, delete: 0 },
      ["purchaseDetailsId", "purchaseId", "qty", "rate", "total", "created"]
    );

    const purchaseIds = [...new Set(purchaseDetails.map((d) => d.purchaseId).filter(Boolean))];
    let purchaseMap = {};
    if (purchaseIds.length) {
      const purchases = await selectWithJoins(
        "purchase", [], { purchaseId: purchaseIds, companyId, delete: 0 },
        ["purchaseId", "purchaseBillNo", "purchaseDate", "accountId"]
      );
      purchases.forEach((p) => { purchaseMap[p.purchaseId] = p; });
    }

    const accountIds = [...new Set(Object.values(purchaseMap).map((p) => p.accountId).filter(Boolean))];
    let accountMap = {};
    if (accountIds.length) {
      const accounts = await selectWithJoins("account", [], { id: accountIds, companyId, delete: 0 }, ["id", "accountName"]);
      accounts.forEach((a) => { accountMap[a.id] = a.accountName; });
    }

    // ---- ✅ NEW — Issue records (Outward) ----
    const itemIssues = await selectWithJoins(
      "itemissue", [],
      { itemId, companyId, delete: 0 },
      ["itemIssueId", "qty", "issuedTo", "billNo", "created"]
    );

    const issuedEmployeeIds = [...new Set(itemIssues.map((d) => d.issuedTo).filter(Boolean))];
    let employeeMap = {};
    if (issuedEmployeeIds.length) {
      const employees = await selectWithJoins(
        "employee", [], { employeeId: issuedEmployeeIds, companyId, delete: 0 },
        ["employeeId", "employeeName"]
      );
      employees.forEach((e) => { employeeMap[e.employeeId] = e.employeeName; });
    }

    let totalPurchaseQty = 0;
    let totalPurchaseValue = 0;
    purchaseDetails.forEach((d) => {
      const qty = Number(d.qty) || 0;
      const rate = Number(d.rate) || 0;
      totalPurchaseQty += qty;
      totalPurchaseValue += qty * rate;
    });

    const totalIssuedQty = itemIssues.reduce((sum, d) => sum + (Number(d.qty) || 0), 0);

    const currentStock = openingStock + totalPurchaseQty - totalIssuedQty; // ✅ issued minus
    const purchasePrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : 0;

    // ---- History rows — Purchase (+) aur Outward (-) dono ek saath, date se sort ----
    const rows = [];
    rows.push({
      id: "opening", date: "", type: "Opening",
      partyName: "", billNo: "",
      qty: String(openingStock), billAmount: "",
      currentStock: String(openingStock),
    });

    const movements = [
      ...purchaseDetails.map((d) => ({
        date: purchaseMap[d.purchaseId]?.purchaseDate || "",
        type: "Purchase",
        partyName: accountMap[purchaseMap[d.purchaseId]?.accountId] || "",
        billNo: purchaseMap[d.purchaseId]?.purchaseBillNo || "",
        qty: Number(d.qty) || 0,
        billAmount: d.total ?? "",
        sortKey: purchaseMap[d.purchaseId]?.purchaseDate || d.created || "",
      })),
      ...itemIssues.map((d) => ({
        date: d.created,
        type: "Outward",
        partyName: employeeMap[d.issuedTo] || "",
        billNo: d.billNo || "-",
        qty: -(Number(d.qty) || 0), // ✅ negative — stock ghatega
        billAmount: "",
        sortKey: d.created,
      })),
    ].sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));

    let runningQtyBalance = openingStock;
    movements.forEach((m, idx) => {
      runningQtyBalance += m.qty;
      rows.push({
        id: `mv-${idx}`,
        date: m.date || "",
        type: m.type,
        partyName: m.partyName,
        billNo: m.billNo,
        qty: String(m.qty),
        billAmount: String(m.billAmount ?? ""),
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