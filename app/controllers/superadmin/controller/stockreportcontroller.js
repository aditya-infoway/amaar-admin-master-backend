const {
  successResponse,
  errorResponse,
  requiredmessage,
  selectWithJoins,
  selectWithJoinsV2,
} = require("../../../helper/index.js");
const { getSalesReservationLines } = require("../../../helper/salesReservation.js");
const { getLeadMapBySalesOrder } = require("../../../helper/leadDetails.js");
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
        "minQty",
        "maxQty",
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

    const returnRows = await selectWithJoins(
      "itemreturn", [],
      { companyId, delete: 0 },
      ["itemId", "qty"],
    );
    const returnedMap = {};
    returnRows.forEach((d) => {
      const qty = Number(d.qty) || 0;
      returnedMap[d.itemId] = (returnedMap[d.itemId] || 0) + qty;
    });
    // Reserved by Sales Orders (via BOM leaf items)
    const reservedMap = {};
    (await getSalesReservationLines(companyId)).forEach((l) => {
      reservedMap[l.itemId] = (reservedMap[l.itemId] || 0) + l.qty;
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
      const returnedStock = Number(returnedMap[item.itemId]) || 0;

      // Final current stock = Opening + Purchase - Issued + Returned
      const currentStock = openingStock + purchaseStock - issuedStock + returnedStock;

      const reservedStock = Number(reservedMap[item.itemId]) || 0;

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
        minQty: String(item.minQty ?? "0"),
        maxQty: String(item.maxQty ?? "0"),
        reservedStock: String(reservedStock),
        availableStock: String(currentStock - reservedStock),
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
      ["itemIssueId", "itemRequestId", "qty", "issuedTo", "billNo", "issueNo", "issueDate", "created"]
    );
    const itemReturns = await selectWithJoins(
      "itemreturn", [],
      { itemId, companyId, delete: 0 },
      ["itemReturnId", "itemRequestId", "qty", "returnedBy", "returnNo", "returnDate", "created"]
    );
    const issuedEmployeeIds = [
      ...new Set([
        ...itemIssues.map((d) => d.issuedTo),
        ...itemReturns.map((d) => d.returnedBy),
      ].filter(Boolean)),
    ];
    let employeeMap = {};
    if (issuedEmployeeIds.length) {
      const employees = await selectWithJoins(
        "employee", [], { employeeId: issuedEmployeeIds, companyId, delete: 0 },
        ["employeeId", "employeeName"]
      );
      employees.forEach((e) => { employeeMap[e.employeeId] = e.employeeName; });
    }
    // itemRequestId -> Sales Order ka Client Name
    const clientByReq = {};
    const reqIds = [
      ...new Set([...itemIssues, ...itemReturns].map((d) => d.itemRequestId).filter(Boolean)),
    ];
    if (reqIds.length) {
      const reqs = await selectWithJoins(
        "itemrequest", [], { itemRequestId: reqIds, companyId, delete: 0 },
        ["itemRequestId", "workOrderId"]
      );
      const woIds = [...new Set(reqs.map((r) => r.workOrderId).filter(Boolean))];
      if (woIds.length) {
        const wos = await selectWithJoins(
          "workorder", [], { workOrderId: woIds, companyId, delete: 0 },
          ["workOrderId", "salesOrderId", "customerName"]
        );
        const leadBySO = await getLeadMapBySalesOrder(wos.map((w) => w.salesOrderId), companyId);
        const nameByWo = {};
        wos.forEach((w) => {
          const lead = leadBySO.get(String(w.salesOrderId));
          nameByWo[w.workOrderId] = lead?.name || w.customerName || "";
        });
        reqs.forEach((r) => { clientByReq[r.itemRequestId] = nameByWo[r.workOrderId] || ""; });
      }
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
    const totalReturnedQty = itemReturns.reduce((sum, d) => sum + (Number(d.qty) || 0), 0);

    const currentStock = openingStock + totalPurchaseQty - totalIssuedQty + totalReturnedQty;// ✅ issued minus
    const purchasePrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : 0;

    // Sales (Sales Order etc.) - not built yet. When ready, push entries like:
    // { date, type: "Sales Order", partyName, voucherNo,
    //   qtyIn: 0, qtyOut: qty, reserve: qty, isSales: true, sortKey: date }
    const salesLines = await getSalesReservationLines(companyId, { itemId });
    const salesMovements = salesLines.map((s) => ({
      date: s.date,
      type: "Sales Order",
      partyName: s.partyName,
      voucherNo: s.soNo,
      qtyIn: 0,
      qtyOut: 0,
      reserve: s.qty,
      isSales: true,
      sortKey: s.sortKey,
    }));
    const totalReserved = salesMovements.reduce((s, m) => s + m.reserve, 0);

    const movements = [
      ...purchaseDetails.map((d) => ({
        date: purchaseMap[d.purchaseId]?.purchaseDate || "",
        type: "Purchase",
        partyName: accountMap[purchaseMap[d.purchaseId]?.accountId] || "",
        voucherNo: purchaseMap[d.purchaseId]?.purchaseBillNo || "",
        qtyIn: Number(d.qty) || 0,
        qtyOut: 0,
        reserve: 0,
        sortKey: purchaseMap[d.purchaseId]?.purchaseDate || d.created || "",
      })),
      ...itemIssues.map((d) => {
        const dt = d.issueDate || d.created;
        return {
          date: dt,
          type: "Issue",
          partyName: clientByReq[d.itemRequestId] || employeeMap[d.issuedTo] || "",
          voucherNo: d.issueNo || d.billNo || "-",
          qtyIn: 0,
          qtyOut: Number(d.qty) || 0,
          reserve: 0,
          sortKey: dt ? new Date(dt).toISOString() : "",
        };
      }),
      ...itemReturns.map((d) => {
        const dt = d.returnDate || d.created;
        return {
          date: dt,
          type: "Return",
                  partyName: clientByReq[d.itemRequestId] || employeeMap[d.returnedBy] || "",
          voucherNo: d.returnNo || "-",
          qtyIn: Number(d.qty) || 0,   // return = stock IN
          qtyOut: 0,
          reserve: 0,
          sortKey: dt ? new Date(dt).toISOString() : "",
        };
      }),
      ...salesMovements,
    ].sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));

    const rows = [
      {
        id: "opening", date: "", type: "Opening",
        voucherNo: "", partyName: "",
        qtyIn: String(openingStock), qtyOut: "0",
        physicalStock: String(openingStock),
        reservedQty: "0", reservedTotal: "0",
        availableStock: String(openingStock),
      },
    ];

    let physical = openingStock;
    let reservedTotal = 0;
    movements.forEach((m, idx) => {
      // Sales qty shows in Qty Out but only reserves; real outflow reduces Physical
      physical += m.qtyIn - (m.isSales ? 0 : m.qtyOut);
      reservedTotal += m.reserve;
      rows.push({
        id: `mv-${idx}`,
        date: m.date || "",
        type: m.type,
        voucherNo: m.voucherNo,
        partyName: m.partyName,
        qtyIn: String(m.qtyIn),
        qtyOut: String(m.qtyOut),
        physicalStock: String(physical),
        reservedQty: String(m.reserve),
        reservedTotal: String(reservedTotal),
        availableStock: String(physical - reservedTotal),
      });
    });

    return successResponse(res, {
      itemId: String(item.itemId), itemCode: item.itemCode || "", itemName: item.itemName || "",
      currentStock: String(currentStock), purchasePrice: purchasePrice.toFixed(2), unit: item.unit || "",
      reservedStock: String(totalReserved),
      availableStock: String(currentStock - totalReserved),
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