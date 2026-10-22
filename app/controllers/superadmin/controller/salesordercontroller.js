const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

const { getLeadMap, leadDetails } = require("../../../helper/leadDetails.js");

const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

// Ek baar me max kitne Sales Order create ho sakte hain (Qty = count)
const MAX_SO_PER_QUOTATION = 50;

// ============================================================
// HELPERS
// ============================================================

const round2 = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

// "YYYY-MM-DD" string -> same string
//   empty / null      -> null       (field not provided)
//   invalid format    -> undefined  (caller should return an error)
const normalizeDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const str = String(value).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return undefined;
  }

  const d = new Date(`${str}T00:00:00`);

  return isNaN(d.getTime()) ? undefined : str;
};

// DB value (string or Date) -> "YYYY-MM-DD" for API response
const formatDateOnly = (value) => {
  if (!value) return "";

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return String(value).slice(0, 10);
};

// Ek unique SO number generate karo (collision pe retry)
const generateUniqueSoNo = async (companyId, financialYearId) => {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "salesorder",
      idColumn: "salesOrderId",
      prefixFor: "SALES ORDER",
    });

    const existing = await selectWithJoins(
      "salesorder",
      [],
      { companyId, financialYearId, soNo: billNo, delete: 0 },
      ["salesOrderId"],
    );

    if (existing.length === 0) return billNo;

    await new Promise((r) => setTimeout(r, 50));
  }

  return null;
};

// ============================================================
// GET NEXT SALES ORDER NO
// ============================================================

const getNextSalesOrderNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year.");

    // Retry a few times in case of a collision with another concurrent request
    let billNo, fyLabel;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const result = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "salesorder",
        idColumn: "salesOrderId",
        prefixFor: "SALES ORDER",
      });

      // Check if this number is already taken
      const existing = await selectWithJoins(
        "salesorder",
        [],
        {
          companyId,
          financialYearId: fy.financialYearId,
          soNo: result.billNo,
          delete: 0,
        },
        ["salesOrderId"],
      );

      if (existing.length === 0) {
        billNo = result.billNo;
        fyLabel = result.fyLabel;
        break;
      }
      // else: collision, loop and try again (a tiny delay helps under real load)
      await new Promise((r) => setTimeout(r, 50));
    }

    if (!billNo) {
      return errorResponse(
        res,
        "Could not generate a unique Sales Order number. Please try again.",
      );
    }

    return successResponse(
      res,
      { soNo: billNo, fyLabel, financialYearId: fy.financialYearId },
      "Sales Order number generated successfully",
    );
  } catch (error) {
    console.error("getNextSalesOrderNo error:", error);
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET QUOTATION FOR SALES ORDER
// ============================================================

const getQuotationForSalesOrder = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { financialYearId } = req.query;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    if (!id) {
      return errorResponse(res, "Quotation id is required.");
    }

    const where = {
      quotationId: id,
      companyId,
      delete: 0,
    };

    if (financialYearId) {
      where.financialYearId = financialYearId;
    }

    const rows = await selectWithJoins("quotation", [], where, [
      "quotationId",
      "financialYearId",
      "qNo",
      "leadId",

      "vehicleType",

      "basicCost",
      "gstAmount",
      "finalPrice",

      "createdBy",
      "createdtype",
      "created",
      "updated",
    ]);

    if (!rows.length) {
      return requiredmessage(res, "Quotation not found.");
    }

    const quotation = rows[0];

    const leadMap = await getLeadMap([quotation.leadId], companyId);

    return successResponse(
      res,
      {
        id: String(quotation.quotationId),

        quotationId: quotation.quotationId,
        financialYearId: quotation.financialYearId,
        qNo: quotation.qNo,

        leadId: quotation.leadId,

        ...leadDetails(leadMap.get(String(quotation.leadId))),

        vehicleType: quotation.vehicleType || "",

        basicCost: Number(quotation.basicCost) || 0,
        gstAmount: Number(quotation.gstAmount) || 0,
        finalPrice: Number(quotation.finalPrice) || 0,

        createdBy: quotation.createdBy || "",
        createdType: quotation.createdtype || "",
        createdAt: quotation.created,
        updatedAt: quotation.updated,
      },
      "Quotation fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// CREATE SALES ORDER
// Qty = kitne Sales Order banane hain. Har SO me qty 1 hogi
// aur har ka apna alag SO number generate hoga.
// ============================================================

const createSalesOrder = async (req, res) => {
  const created = []; // ab tak save hue orders (partial failure message ke liye)

  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      financialYearId,
      quotationId,
      leadId,
      accountId,
      expectedDate,

      qty,
      unitPrice,

      createdBy,
      createdType,
    } = req.body;

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );
    }

    if (!normalizeId(quotationId)) {
      return errorResponse(res, "Please select a quotation.");
    }

    if (!normalizeId(leadId)) {
      return errorResponse(res, "Please select a lead.");
    }

    // expected date (optional, but must be a valid date if sent)
    const finalExpectedDate = normalizeDate(expectedDate);

    if (finalExpectedDate === undefined) {
      return errorResponse(res, "Invalid expected date.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    // ========================================================
    // QUANTITY (= number of Sales Orders to create)
    // ========================================================

    const orderCount = Number(qty) || 0;
    const finalUnitPrice = Number(unitPrice) || 0;

    if (!Number.isInteger(orderCount) || orderCount <= 0) {
      return errorResponse(res, "Quantity must be a whole number greater than 0.");
    }

    if (orderCount > MAX_SO_PER_QUOTATION) {
      return errorResponse(
        res,
        `Quantity cannot be more than ${MAX_SO_PER_QUOTATION}.`,
      );
    }

    if (finalUnitPrice < 0) {
      return errorResponse(res, "Amount cannot be negative.");
    }

    // ========================================================
    // CHECK ACCOUNT (agar party select ki gayi ho)
    // ========================================================

    let normalizedAccountId = normalizeId(accountId);

    if (normalizedAccountId) {
      const accountRows = await selectWithJoins(
        "account",
        [],
        { id: normalizedAccountId, companyId, delete: 0 },
        ["id"],
      );

      if (!accountRows.length) {
        return errorResponse(res, "Selected party (account) was not found.");
      }
    }

    // ========================================================
    // CHECK QUOTATION
    // ========================================================

    const quotationRows = await selectWithJoins(
      "quotation",
      [],
      {
        quotationId,
        companyId,
        financialYearId: fy.financialYearId,
        delete: 0,
      },
      ["quotationId", "qNo", "leadId", "finalPrice"],
    );

    if (!quotationRows.length) {
      return errorResponse(res, "Selected quotation was not found.");
    }

    const quotation = quotationRows[0];

    if (normalizeId(leadId) !== normalizeId(quotation.leadId)) {
      return errorResponse(
        res,
        "Selected lead does not belong to this quotation.",
      );
    }

    const leadRows = await selectWithJoins(
      "lead",
      [],
      { leadId: normalizeId(leadId), companyId, delete: 0 },
      [
        "leadId",
        "leadCode",
        "name",
        "number",
        "email",
        "address",
        "city",
        "model",
        "remark",
      ],
    );
    if (!leadRows.length) {
      return errorResponse(res, "Selected lead was not found.");
    }
    const lead = leadRows[0];

    // ========================================================
    // CHECK DUPLICATE SALES ORDER FOR QUOTATION
    // (is quotation par pehle se SO bane hain to dobara nahi banenge)
    // ========================================================

    const duplicate = await selectWithJoins(
      "salesorder",
      [],
      { companyId, quotationId, delete: 0 },
      ["salesOrderId", "soNo"],
    );

    if (duplicate.length > 0) {
      return errorResponse(
        res,
        `Sales Order already exists for this quotation (${duplicate[0].soNo}).`,
      );
    }

    // ========================================================
    // CREATE N SALES ORDERS — har ek qty 1, alag SO number
    // ========================================================

    const perOrderQty = 1;
    const perOrderTotal = round2(perOrderQty * finalUnitPrice);

    for (let i = 0; i < orderCount; i++) {
      const soNo = await generateUniqueSoNo(companyId, fy.financialYearId);

      if (!soNo) {
        const doneMsg = created.length
          ? ` ${created.length} order(s) already created (${created
              .map((c) => c.soNo)
              .join(", ")}).`
          : "";
        return errorResponse(
          res,
          `Could not generate a unique Sales Order number. Please try again.${doneMsg}`,
        );
      }

      const salesOrder = await saveModel("salesorder", {
        companyId,
        financialYearId: fy.financialYearId,

        soNo,

        quotationId: quotation.quotationId,
        leadId,
        accountId: normalizedAccountId,
        expectedDate: finalExpectedDate,

        ...leadDetails(lead),

        qty: perOrderQty,
        unitPrice: finalUnitPrice,
        totalAmount: perOrderTotal,

        createdBy: req.employeeId ? String(req.employeeId) : createdBy || null,
        createdtype: req.employeeId ? "Sale Executive" : createdType || null,

        delete: 0,
      });

      created.push({
        salesOrderId: salesOrder.salesOrderId,
        soNo,
        qty: perOrderQty,
        unitPrice: finalUnitPrice,
        totalAmount: perOrderTotal,
      });
    }

    const first = created[0];
    const last = created[created.length - 1];

    const message =
      created.length === 1
        ? "Sales Order saved successfully"
        : `${created.length} Sales Orders created (${first.soNo} to ${last.soNo})`;

    return successResponse(
      res,
      {
        // pehle order ki details — purane frontend code ke liye
        salesOrderId: first.salesOrderId,
        soNo: first.soNo,

        count: created.length,
        salesOrders: created,

        quotationId: quotation.quotationId,
        qNo: quotation.qNo,

        leadId,
        accountId: normalizedAccountId,
        expectedDate: finalExpectedDate || "",

        qty: perOrderQty,
        unitPrice: finalUnitPrice,
        totalAmount: perOrderTotal,
      },
      message,
    );
  } catch (error) {
    const doneMsg = created.length
      ? ` (${created.length} order(s) were already created: ${created
          .map((c) => c.soNo)
          .join(", ")})`
      : "";

    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, `This Sales Order already exists.${doneMsg}`);
    }
    return errorResponse(
      res,
      `${error.message || "Something Went Wrong"}${doneMsg}`,
      error,
    );
  }
};

// ============================================================
// GET SALES ORDER LIST
// ============================================================

const getSalesOrderList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      financialYearId,
      role,
      pendingOnly,
      excludeBilled,
      includeSalesOrderId,
    } = req.query;

    const branchId = req.branchId;
    const employeeId = req.employeeId;

    const salesOrderWhere = {
      companyId,
      delete: 0,
    };

    // ========================================================
    // EMPLOYEE
    // ========================================================

    if (employeeId) {
      salesOrderWhere.createdBy = String(employeeId);
      salesOrderWhere.createdtype = "Sale Executive";
    }

    // ========================================================
    // BRANCH
    // ========================================================
    else if (role === "Branch") {
      if (!branchId) {
        return requiredmessage(res, "Branch not found.");
      }

      salesOrderWhere.branchId = branchId;
    }

    // ========================================================
    // FINANCIAL YEAR
    // ========================================================

    if (financialYearId) {
      salesOrderWhere.financialYearId = financialYearId;
    }

    // ========================================================
    // FETCH SALES ORDERS
    // ========================================================

    const allSalesOrders = await selectWithJoins(
      "salesorder",
      [],
      salesOrderWhere,
      [
        "salesOrderId",
        "companyId",
        "financialYearId",

        "soNo",

        "quotationId",
        "leadId",
        "accountId",
        "expectedDate",

        "qty",
        "unitPrice",
        "totalAmount",

        "createdBy",
        "createdtype",

        "created",
        "updated",
      ],
      [["salesOrderId", "DESC"]],
    );

    // Sales Register dropdown ke liye billed orders hata do
    let salesOrders = allSalesOrders;
    const wantPendingOnly =
      String(pendingOnly) === "true" || String(excludeBilled) === "true";

    if (wantPendingOnly) {
      const billed = await selectWithJoins(
        "sales",
        [],
        { companyId, delete: 0 },
        ["salesOrderId"],
      );
      const billedIds = new Set(
        billed
          .map((b) => b.salesOrderId)
          .filter(Boolean)
          .map(String),
      );

      salesOrders = allSalesOrders.filter(
        (so) =>
          !billedIds.has(String(so.salesOrderId)) ||
          String(so.salesOrderId) === String(includeSalesOrderId || ""),
      );
    }

    if (!salesOrders.length) {
      return successResponse(res, [], "Sales Order list fetched successfully");
    }

    // ========================================================
    // GET EMPLOYEE IDS
    // ========================================================

    const employeeIds = salesOrders
      .map((item) => item.createdBy)
      .filter((id) => id && id !== "" && id !== "Admin" && !isNaN(Number(id)));

    let employeeMap = {};

    if (employeeIds.length > 0) {
      try {
        const employees = await selectWithJoins(
          "employee",
          [],
          {
            employeeId: employeeIds,
          },
          ["employeeId", "employeeName"],
        );

        employeeMap = employees.reduce((map, emp) => {
          map[String(emp.employeeId)] =
            emp.employeeName || String(emp.employeeId);

          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching employees:", err.message);
      }
    }

    // ========================================================
    // GET QUOTATION NUMBERS
    // ========================================================

    const quotationIds = salesOrders
      .map((item) => item.quotationId)
      .filter((id) => id);

    let quotationMap = {};

    if (quotationIds.length > 0) {
      try {
        const quotations = await selectWithJoins(
          "quotation",
          [],
          {
            quotationId: quotationIds,
            companyId,
            delete: 0,
          },
          ["quotationId", "qNo"],
        );

        quotationMap = quotations.reduce((map, quotation) => {
          map[String(quotation.quotationId)] = quotation.qNo || "";

          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching quotations:", err.message);
      }
    }

    // ========================================================
    // GET ACCOUNT (PARTY) KYC DETAILS
    // ========================================================

    const accountIds = [
      ...new Set(salesOrders.map((item) => item.accountId).filter((id) => id)),
    ];

    let accountMap = {};

    if (accountIds.length > 0) {
      try {
        const accounts = await selectWithJoins(
          "account",
          [],
          { id: accountIds, companyId, delete: 0 },
          [
            "id",
            "accountName",
            "mobileNo",
            "email",
            "aadharCardNo",
            "aadharImage",
            "panCard",
            "panImage",
            "gstNo",
            "gstImage",
          ],
        );

        accountMap = accounts.reduce((map, acc) => {
          map[String(acc.id)] = acc;
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching accounts:", err.message);
      }
    }

    // ========================================================
    // GET MODEL NAMES
    // ========================================================

    const leadMap = await getLeadMap(
      salesOrders.map((item) => item.leadId),
      companyId,
    );

    const modelIds = [
      ...new Set([...leadMap.values()].map((l) => l.model).filter(Boolean)),
    ];

    let modelMap = {};

    if (modelIds.length > 0) {
      try {
        const models = await selectWithJoins(
          "itemmaster",
          [],
          { itemId: modelIds },
          ["itemId", "itemName"],
        );

        modelMap = models.reduce((map, m) => {
          map[String(m.itemId)] = m.itemName || "";
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching models:", err.message);
      }
    }

    // ========================================================
    // FORMAT RESPONSE
    // ========================================================

    const data = salesOrders.map((salesOrder) => {
      const lead = leadMap.get(String(salesOrder.leadId));
      const account = accountMap[String(salesOrder.accountId)];
      let createdByName = salesOrder.createdBy || "";

      if (createdByName === "Admin") {
        createdByName = "Admin";
      } else if (
        !isNaN(Number(createdByName)) &&
        employeeMap[String(createdByName)]
      ) {
        createdByName = employeeMap[String(createdByName)];
      }

      return {
        id: String(salesOrder.salesOrderId),

        financialYearId: salesOrder.financialYearId,

        soNo: salesOrder.soNo || "",

        quotationId: String(salesOrder.quotationId || ""),

        qNo: quotationMap[String(salesOrder.quotationId)] || "",

        leadId: salesOrder.leadId,
        accountId: salesOrder.accountId || null,
        expectedDate: formatDateOnly(salesOrder.expectedDate),

        ...leadDetails(lead),
        modelName: modelMap[String(lead?.model)] || "",

        qty: Number(salesOrder.qty) || 0,

        unitPrice: Number(salesOrder.unitPrice) || 0,

        totalAmount: Number(salesOrder.totalAmount) || 0,

        // Selected party ka KYC — account table se
        partyName: account?.accountName || "",
        partyMobile: account?.mobileNo || "",
        partyEmail: account?.email || "",
        aadharNumber: account?.aadharCardNo || "",
        aadharImage: account?.aadharImage || "",
        panNumber: account?.panCard || "",
        panImage: account?.panImage || "",
        gstNumber: account?.gstNo || "",
        gstImage: account?.gstImage || "",

        createdBy: createdByName,

        createdType: salesOrder.createdtype || "",

        createdAt: salesOrder.created,

        updatedAt: salesOrder.updated,
      };
    });

    return successResponse(res, data, "Sales Order list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET SALES ORDER BY ID
// ============================================================

const getSalesOrderById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Sales Order id is required.");
    }

    const rows = await selectWithJoins(
      "salesorder",
      [],
      {
        salesOrderId: id,
        companyId,
        delete: 0,
      },
      [
        "salesOrderId",
        "financialYearId",

        "soNo",

        "quotationId",
        "leadId",
        "accountId",
        "expectedDate",

        "qty",
        "unitPrice",
        "totalAmount",

        "createdBy",
        "createdtype",

        "created",
        "updated",
      ],
    );

    if (!rows.length) {
      return requiredmessage(res, "Sales Order not found.");
    }

    const salesOrder = rows[0];

    // ========================================================
    // GET QUOTATION NUMBER
    // ========================================================

    let qNo = "";

    if (salesOrder.quotationId) {
      const quotationRows = await selectWithJoins(
        "quotation",
        [],
        {
          quotationId: salesOrder.quotationId,
          companyId,
          delete: 0,
        },
        ["quotationId", "qNo"],
      );

      if (quotationRows.length) {
        qNo = quotationRows[0].qNo || "";
      }
    }

    // ========================================================
    // GET ACCOUNT (PARTY) KYC DETAILS
    // ========================================================

    let account = null;

    if (salesOrder.accountId) {
      const accountRows = await selectWithJoins(
        "account",
        [],
        { id: salesOrder.accountId, companyId, delete: 0 },
        [
          "id",
          "accountName",
          "mobileNo",
          "email",
          "aadharCardNo",
          "aadharImage",
          "panCard",
          "panImage",
          "gstNo",
          "gstImage",
        ],
      );

      if (accountRows.length) {
        account = accountRows[0];
      }
    }

    // ========================================================
    // GET MODEL NAME
    // ========================================================

    const leadMap = await getLeadMap([salesOrder.leadId], companyId);
    const lead = leadMap.get(String(salesOrder.leadId));

    let modelName = "";

    if (lead?.model) {
      const modelRows = await selectWithJoins(
        "itemmaster",
        [],
        { itemId: lead.model },
        ["itemId", "itemName"],
      );
      if (modelRows.length) {
        modelName = modelRows[0].itemName || "";
      }
    }

    return successResponse(
      res,
      {
        id: String(salesOrder.salesOrderId),

        financialYearId: salesOrder.financialYearId,

        soNo: salesOrder.soNo || "",

        quotationId: String(salesOrder.quotationId || ""),

        qNo,

        leadId: salesOrder.leadId,
        accountId: salesOrder.accountId || null,
        expectedDate: formatDateOnly(salesOrder.expectedDate),

        ...leadDetails(lead),
        modelName: modelName || "",

        qty: Number(salesOrder.qty) || 0,

        unitPrice: Number(salesOrder.unitPrice) || 0,

        totalAmount: Number(salesOrder.totalAmount) || 0,

        // Selected party ka KYC — account table se
        partyName: account?.accountName || "",
        partyMobile: account?.mobileNo || "",
        partyEmail: account?.email || "",
        aadharNumber: account?.aadharCardNo || "",
        aadharImage: account?.aadharImage || "",
        panNumber: account?.panCard || "",
        panImage: account?.panImage || "",
        gstNumber: account?.gstNo || "",
        gstImage: account?.gstImage || "",

        createdBy: salesOrder.createdBy || "",

        createdType: salesOrder.createdtype || "",

        createdAt: salesOrder.created,

        updatedAt: salesOrder.updated,
      },
      "Sales Order fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// UPDATE SALES ORDER
// Ek quotation ke multiple SO valid hain (create me Qty = count),
// isliye "another SO exists for quotation" check hata diya gaya hai.
// Qty edit me change nahi hoti — row ki existing qty hi rehti hai.
// ============================================================

const updateSalesOrder = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Sales Order id is required.");
    }

    const existingRows = await selectWithJoins(
      "salesorder",
      [],
      { salesOrderId: id, companyId, delete: 0 },
      ["salesOrderId", "financialYearId", "soNo", "quotationId", "qty"],
    );

    if (!existingRows.length) {
      return requiredmessage(res, "Sales Order not found.");
    }

    const existing = existingRows[0];

    const {
      financialYearId,
      quotationId,
      leadId,
      accountId,
      expectedDate,

      unitPrice,

      createdBy,
      createdType,
    } = req.body;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );
    }

    if (!normalizeId(quotationId)) {
      return errorResponse(res, "Please select a quotation.");
    }

    if (!normalizeId(leadId)) {
      return errorResponse(res, "Please select a lead.");
    }

    // expected date (optional, but must be a valid date if sent)
    const finalExpectedDate = normalizeDate(expectedDate);

    if (finalExpectedDate === undefined) {
      return errorResponse(res, "Invalid expected date.");
    }

    const fy = await getFinancialYearById(financialYearId, companyId);

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    // ========================================================
    // CHECK ACCOUNT
    // ========================================================

    let normalizedAccountId = normalizeId(accountId);

    if (normalizedAccountId) {
      const accountRows = await selectWithJoins(
        "account",
        [],
        { id: normalizedAccountId, companyId, delete: 0 },
        ["id"],
      );

      if (!accountRows.length) {
        return errorResponse(res, "Selected party (account) was not found.");
      }
    }

    // ========================================================
    // CHECK QUOTATION
    // ========================================================

    const quotationRows = await selectWithJoins(
      "quotation",
      [],
      {
        quotationId,
        companyId,
        financialYearId: fy.financialYearId,
        delete: 0,
      },
      ["quotationId", "qNo", "leadId", "finalPrice"],
    );

    if (!quotationRows.length) {
      return errorResponse(res, "Selected quotation was not found.");
    }

    const quotation = quotationRows[0];

    if (normalizeId(leadId) !== normalizeId(quotation.leadId)) {
      return errorResponse(
        res,
        "Selected lead does not belong to this quotation.",
      );
    }

    const leadRows = await selectWithJoins(
      "lead",
      [],
      { leadId: normalizeId(leadId), companyId, delete: 0 },
      ["leadId", "leadCode"],
    );
    if (!leadRows.length) {
      return errorResponse(res, "Selected lead was not found.");
    }
    const lead = leadRows[0];

    // ========================================================
    // AMOUNT — qty existing row ki hi rahegi
    // ========================================================

    const finalQty = Number(existing.qty) || 1;
    const finalUnitPrice = Number(unitPrice) || 0;

    if (finalUnitPrice < 0) {
      return errorResponse(res, "Amount cannot be negative.");
    }

    const finalTotalAmount = round2(finalQty * finalUnitPrice);

    // ========================================================
    // UPDATE DATA
    // ========================================================

    const updateData = {
      financialYearId: fy.financialYearId,

      quotationId: quotation.quotationId,
      leadId,
      accountId: normalizedAccountId,
      expectedDate: finalExpectedDate,

      qty: finalQty,
      unitPrice: finalUnitPrice,
      totalAmount: finalTotalAmount,

      createdBy: req.employeeId ? String(req.employeeId) : createdBy || null,
      createdtype: req.employeeId ? "Sale Executive" : createdType || null,

      updated: new Date(),
    };

    await updateModelHelper("salesorder", updateData, {
      salesOrderId: id,
      companyId,
      delete: 0,
    });

    return successResponse(
      res,
      {
        salesOrderId: Number(id),
        soNo: existing.soNo,

        quotationId: quotation.quotationId,
        qNo: quotation.qNo,

        leadId,
        accountId: normalizedAccountId,
        expectedDate: finalExpectedDate || "",
        ...leadDetails(lead),

        qty: finalQty,
        unitPrice: finalUnitPrice,
        totalAmount: finalTotalAmount,
      },
      "Sales Order updated successfully",
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This Sales Order already exists.");
    }
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// DELETE SALES ORDER
// ============================================================

const deleteSalesOrder = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Sales Order id is required.");
    }

    const existing = await selectWithJoins(
      "salesorder",
      [],
      {
        salesOrderId: id,
        companyId,
        delete: 0,
      },
      ["salesOrderId", "soNo"],
    );

    if (!existing.length) {
      return requiredmessage(res, "Sales Order not found.");
    }

    await updateModelHelper(
      "salesorder",
      {
        delete: 1,
        updated: new Date(),
      },
      {
        salesOrderId: id,
        companyId,
      },
    );

    return successResponse(
      res,
      {
        salesOrderId: Number(id),
        soNo: existing[0].soNo,
      },
      "Sales Order deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// PENDING ADVANCE SALES ORDERS
// ============================================================

const getPendingAdvanceSalesOrders = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;

    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const orders = await selectWithJoins(
      "salesorder",
      [],
      where,
      ["salesOrderId", "soNo", "accountId", "totalAmount"],
      [["salesOrderId", "DESC"]],
    );
    if (!orders.length)
      return successResponse(res, [], "No pending sales orders");

    const soIds = orders.map((o) => o.salesOrderId);

    // jin SO ka invoice ban chuka, unhe hatao
    const invoiced = await selectWithJoins(
      "sales",
      [],
      { companyId, salesOrderId: soIds, delete: 0 },
      ["salesOrderId"],
    );
    const invoicedSet = new Set(invoiced.map((i) => String(i.salesOrderId)));

    // ab tak mile advances
    const advances = await selectWithJoins(
      "payment",
      [],
      {
        companyId,
        salesOrderId: soIds,
        voucherType: ["CASH RECEIPT", "BANK RECEIPT"],
        delete: 0,
      },
      ["salesOrderId", "amount"],
    );
    const advMap = advances.reduce((m, a) => {
      m[String(a.salesOrderId)] =
        (m[String(a.salesOrderId)] || 0) + Number(a.amount || 0);
      return m;
    }, {});

    const data = orders
      .filter((o) => !invoicedSet.has(String(o.salesOrderId)))
      .map((o) => {
        const total = round2(o.totalAmount);
        const received = round2(advMap[String(o.salesOrderId)] || 0);
        return {
          id: String(o.salesOrderId),
          soNo: o.soNo,
          accountId: o.accountId,
          totalAmount: total,
          receivedAmount: received,
          pendingAmount: round2(total - received),
        };
      })
      .filter((o) => o.pendingAmount > 0);

    return successResponse(
      res,
      data,
      "Pending sales orders fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getNextSalesOrderNo,
  getQuotationForSalesOrder,
  createSalesOrder,
  getSalesOrderList,
  getSalesOrderById,
  updateSalesOrder,
  deleteSalesOrder,
  getPendingAdvanceSalesOrders,
};