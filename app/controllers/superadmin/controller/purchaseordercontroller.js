const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel,
  selectWithJoins,
  selectWithJoinsV2,
} = require("../../../helper/index.js");
const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");
const {
  getCompanyForMail,
  buildPurchaseOrderMail,
} = require("../../../helper/purchaseOrderMail.js");
const { sendMail } = require("../../../helper/mail.js");

// ---------------- GET NEXT PO NUMBER (purchase ki tarah hi generate) ----------------
const getNextPoNumber = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(
        res,
        "Financial Year not found in session. Please select a company year.",
      );

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "purchaseorder",
      idColumn: "purchaseOrderId",
      prefixFor: "PURCHASE ORDER",
    });

    return successResponse(
      res,
      { poNumber: billNo, fyLabel, financialYearId },
      "PO number generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- ITEM SELECT KARNE PAR: is item ki supplier-wise purchase history ----------------
const getItemSupplierInfo = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { itemId } = req.params;
    if (!itemId) return errorResponse(res, "Item id is required.");

    // ---- directly list Sundry Creditor / Supplier accounts (groupId 30, 34) ----
    const supplierRows = await selectWithJoinsV2(
      "account",
      [],
      {
        'account."companyId"': companyId,
        'account."groupId"': { IN: "(30,34)" },
        'account."delete"': 0,
      },
      [
        'account.id AS "supplierId"',
        'account."accountName" AS "supplierName"',
        'account."mobileNo"',
        'account."stateName"',
      ],
      [['account."accountName"', "ASC"]],
      0,
      0,
    );

    // ---- koi purchase history nahi mili to itemmaster se fallback rate ----
    let fallback = null;
    const itemRows = await selectWithJoins(
      "itemmaster",
      [],
      { itemId, companyId, delete: 0 },
      ["taxSlab", "unit", "hsnCode"],
    );
    if (itemRows.length > 0) fallback = itemRows[0];

    return successResponse(
      res,
      {
        suppliers: supplierRows, // all Sundry Creditor / Supplier accounts
        lastPurchase: null,
        fallback,
      },
      "Item supplier info fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- CREATE PURCHASE ORDER (Save Draft / Generate PO) ----------------
const createPurchaseOrder = async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      financialYearId,
      poDate,
      requiredDate,
      branchId,
      narration,
      discountAmount,
      roundAmount,
      status,
      items,
      indentId,
      emailSupplierIds,
    } = req.body;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(res, "Financial Year not found in session.");
    if (!Array.isArray(items) || items.length === 0)
      return errorResponse(res, "Please add at least one item.");

    const fy = await getFinancialYearById(financialYearId, companyId);
    if (!fy) return errorResponse(res, "Invalid Financial Year in session.");

    const groups = {};
    for (const row of items) {
      if (!row.itemId)
        return errorResponse(
          res,
          `Item id missing for "${row.itemName || "an item"}".`,
        );
      if (!row.qty || row.qty <= 0)
        return errorResponse(res, `Invalid quantity for "${row.itemName}".`);
      if (!row.supplierId)
        return errorResponse(res, `Supplier missing for "${row.itemName}".`);
      (groups[row.supplierId] ||= []).push(row);
    }

    // Same serial number for every supplier in this batch
    // Get the highest existing serial number for this company + financial year
    const existingPOs = await selectWithJoins(
      "purchaseorder",
      [],
      { companyId, financialYearId: fy.financialYearId, delete: 0 },
      ["serialNo"],
    );

    const maxExistingSerial = existingPOs.reduce(
      (max, row) => Math.max(max, Number(row.serialNo) || 0),
      0,
    );

    // Same serial number for every supplier in this batch
    const batchSerialNo = maxExistingSerial + 1;

    const mailSet = new Set((emailSupplierIds || []).map(String));
    const mailQueue = [];
    const orders = [];

    for (const supplierId of Object.keys(groups)) {
      // Generate a UNIQUE PO NUMBER for this supplier
      const { billNo } = await generateVoucherNo({
        companyId,
        financialYearId: fy.financialYearId,
        tableName: "purchaseorder",
        idColumn: "purchaseOrderId",
        prefixFor: "PURCHASE ORDER",
      });

      // Same serial number for ALL suppliers in this batch
      const serialForThisSupplier = batchSerialNo;

      const supRows = await selectWithJoins(
        "account",
        [],
        { id: supplierId, companyId, delete: 0 },
        [
          "id",
          "accountName",
          "mobileNo",
          "email",
          "cityName",
          "addressLine1",
          "addressLine2",
          "stateName",
          "pincode",
          "gstNo",
        ],
      );
      if (supRows.length === 0)
        return errorResponse(res, "Selected supplier is invalid.");
      const supplier = supRows[0];

      let taxableValue = 0,
        totalGst = 0;
      const cleanItems = [];
      for (const row of groups[supplierId]) {
        const itemRows = await selectWithJoins(
          "itemmaster",
          [],
          { itemId: row.itemId, companyId, delete: 0 },
          ["itemId"],
        );
        if (itemRows.length === 0)
          return errorResponse(
            res,
            `Item "${row.itemName}" not found or invalid.`,
          );

        const qty = Number(row.qty) || 0,
          rate = Number(row.rate) || 0,
          discount = Number(row.discount) || 0,
          gstPct = Number(row.gstPct) || 0;
        const taxable = qty * rate * (1 - discount / 100);
        const gstAmt = (taxable * gstPct) / 100;
        taxableValue += taxable;
        totalGst += gstAmt;
        cleanItems.push({
          itemId: row.itemId,
          supplierId,
          itemCode: row.itemCode || "",
          itemName: row.itemName,
          hsnCode: row.hsnCode || "",
          uom: row.uom || "",
          qty,
          rate,
          discount,
          taxable,
          gstPct,
          gstAmt,
          total: taxable + gstAmt,
        });
      }

      const grandTotal =
        taxableValue +
        totalGst -
        (Number(discountAmount) || 0) +
        (Number(roundAmount) || 0);
      const finalStatus = status === "Generated" ? "Generated" : "Draft";

      const po = await saveModel("purchaseorder", {
        companyId,
        financialYearId: fy.financialYearId,
        poDate,
        poNumber: billNo, // shared across all suppliers in this batch
        serialNo: serialForThisSupplier, // unique per supplier
        requiredDate: requiredDate || null,
        branchId: branchId || null,
        indentId: indentId || null,
        narration: narration || "",
        taxableValue: Number(taxableValue.toFixed(2)),
        gstAmount: Number(totalGst.toFixed(2)),
        discountAmount: Number(discountAmount) || 0,
        roundAmount: Number(roundAmount) || 0,
        grandTotal: Number(grandTotal.toFixed(2)),
        status: finalStatus,
        delete: 0,
      });

      for (const row of cleanItems)
        await saveModel("purchaseorderdetails", {
          purchaseOrderId: po.purchaseOrderId,
          companyId,
          ...row,
          delete: 0,
        });

      orders.push({
        purchaseOrderId: po.purchaseOrderId,
        poNumber: billNo,
        serialNo: serialForThisSupplier,
        grandTotal: Number(grandTotal.toFixed(2)),
        supplierId: supplier.id,
        supplierName: supplier.accountName,
        supplierNumber: supplier.mobileNo,
        supplierEmail: supplier.email,
        supplierCity: supplier.cityName,
        items: cleanItems.map((i) => ({
          itemCode: i.itemCode,
          itemName: i.itemName,
          uom: i.uom,
          qty: i.qty,
          rate: i.rate,
          total: i.total,
        })),
      });
      const savedOrder = orders[orders.length - 1];
      savedOrder.mailStatus = "skipped";
      if (mailSet.has(String(supplier.id))) {
        mailQueue.push({ order: savedOrder, supplier, items: cleanItems });
      }
    }

    if (mailQueue.length) {
      const company = await getCompanyForMail(companyId);
      for (const job of mailQueue) {
        if (!job.supplier.email) continue; // stays null, no icon
        try {
          const { subject, html, attachments } = buildPurchaseOrderMail({
            company,
            supplier: job.supplier,
            poNumber: job.order.poNumber,
            poDate,
            requiredDate,
            items: job.items,
          });
          const info = await sendMail({
            to: job.supplier.email,
            subject,
            html,
            attachments,
            fromName: company.companyName || "Autobook",
            replyTo: company.email || undefined,
          });
          job.order.mailStatus = info?.accepted?.length ? "sent" : "failed";
        } catch (e) {
          console.error("PO mail failed:", job.supplier.email, e.message);
          job.order.mailStatus = "failed";
        }

        await updateModel(
          "purchaseorder",
          { mailStatus: job.order.mailStatus },
          { purchaseOrderId: job.order.purchaseOrderId, companyId },
        );
      }
    }

    return successResponse(
      res,
      { orders },
      "Purchase order(s) generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- LIST (dynamic — table me supplier names bhi group hoke aayenge) ----------------
const getPurchaseOrderList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { financialYearId } = req.query;
    const where = { companyId, delete: 0 };
    if (financialYearId) where.financialYearId = financialYearId;

    const pos = await selectWithJoins("purchaseorder", [], where, [
      "purchaseOrderId",
      "poNumber",
      "poDate",
      "branchId",
      "serialNo",
      "taxableValue",
      "gstAmount",
      "grandTotal",
      "status",
      "mailStatus",
    ]);
    if (!pos.length)
      return successResponse(
        res,
        [],
        "Purchase order list fetched successfully",
      );

    const poIds = pos.map((p) => p.purchaseOrderId);
    const details = await selectWithJoins(
      "purchaseorderdetails",
      [],
      { purchaseOrderId: poIds, companyId, delete: 0 },
      ["purchaseOrderId", "supplierId"],
    );

    const branchIds = [...new Set(pos.map((p) => p.branchId).filter(Boolean))];
    let branchMap = {};
    if (branchIds.length) {
      try {
        const branches = await selectWithJoins(
          "branch",
          [],
          { branchId: branchIds, companyId, delete: 0 },
          ["branchId", "branchName"],
        );
        branches.forEach((b) => {
          branchMap[b.branchId] = b;
        });
      } catch (e) {
        branchMap = {};
      }
    }

    const supplierIds = [
      ...new Set(details.map((d) => d.supplierId).filter(Boolean)),
    ];
    let accountMap = {};
    if (supplierIds.length) {
      const accounts = await selectWithJoins(
        "account",
        [],
        { id: supplierIds, companyId, delete: 0 },
        ["id", "accountName"],
      );
      accounts.forEach((a) => {
        accountMap[a.id] = a;
      });
    }

    const supplierNamesByPo = {};
    details.forEach((d) => {
      if (!d.supplierId || !accountMap[d.supplierId]) return;
      if (!supplierNamesByPo[d.purchaseOrderId])
        supplierNamesByPo[d.purchaseOrderId] = new Set();
      supplierNamesByPo[d.purchaseOrderId].add(
        accountMap[d.supplierId].accountName,
      );
    });

    const data = pos.map((p) => {
      const names = supplierNamesByPo[p.purchaseOrderId];
      const supplierName = names ? [...names].join(", ") : "";
      const branch = branchMap[p.branchId] || {};
      return {
        id: String(p.purchaseOrderId),
        poNumber: p.poNumber,
        poDate: p.poDate,
        serialNo: p.serialNo ?? null,
        supplierName,
        deliveryLocation: branch.branchName || "Main Branch",
        totalAmount: String(p.grandTotal),
        status: p.status,
        mailStatus: p.mailStatus || null,
      };
    });

    return successResponse(
      res,
      data,
      "Purchase order list fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID (view/edit ke liye) ----------------
const getPurchaseOrderById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    const { id } = req.params;

    const rows = await selectWithJoins(
      "purchaseorder",
      [],
      { purchaseOrderId: id, companyId, delete: 0 },
      [
        "purchaseOrderId",
        "poNumber",
        "poDate",
        "requiredDate",
        "branchId",
        "narration",
        "taxableValue",
        "gstAmount",
        "discountAmount",
        "roundAmount",
        "grandTotal",
        "status",
      ],
    );
    if (rows.length === 0)
      return requiredmessage(res, "Purchase order not found");

    const items = await selectWithJoins(
      "purchaseorderdetails",
      [],
      { purchaseOrderId: id, companyId, delete: 0 },
      [
        "purchaseOrderDetailsId",
        "itemId",
        "supplierId",
        "itemCode",
        "itemName",
        "hsnCode",
        "uom",
        "qty",
        "rate",
        "discount",
        "taxable",
        "gstPct",
        "gstAmt",
        "total",
      ],
    );

    return successResponse(
      res,
      { ...rows[0], items },
      "Purchase order fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getIndentItemsForPO = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");

    const { indentId } = req.params;
    if (!indentId) return errorResponse(res, "Indent id is required.");

    const rows = await selectWithJoins(
      "indentitem",
      [],
      { indentId, companyId },
      [
        "indentItemId",
        "itemId",
        "itemCode",
        "itemName",
        "unit",
        "hsnCode",
        "taxSlab",
        "purchaseRequired",
      ],
    );

    const items = rows.map((r) => ({
      id: r.indentItemId,
      itemId: r.itemId,
      itemCode: r.itemCode,
      itemName: r.itemName,
      unit: r.unit,
      hsn: r.hsnCode || "",
      qty: Number(r.purchaseRequired) || 0,
      rate: 0,
      gstPct: Number(r.taxSlab) || 0,
    }));

    return successResponse(res, items, "Indent items fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getNextSerialNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    if (!financialYearId)
      return errorResponse(
        res,
        "Financial Year not found in session. Please select a company year.",
      );

    const existingPOs = await selectWithJoins(
      "purchaseorder",
      [],
      { companyId, financialYearId, delete: 0 },
      ["serialNo"], // CHANGED: fetch serialNo instead of purchaseOrderId
    );

    const maxExistingSerial = existingPOs.reduce(
      (max, row) => Math.max(max, Number(row.serialNo) || 0),
      0,
    );

    return successResponse(
      res,
      { serialNo: maxExistingSerial + 1 }, // CHANGED
      "Next serial no fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

const getVendorHistory = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId)
      return requiredmessage(res, "Unauthorized. Please login again.");
    const { supplierId } = req.params;
    if (!supplierId) return errorResponse(res, "Supplier id is required.");

    const details = await selectWithJoinsV2(
      "purchaseorderdetails",
      [
        {
          table: "purchaseorder",
          alias: "po",
          onClause: {
            'po."purchaseOrderId"': {
              "=": 'purchaseorderdetails."purchaseOrderId"',
            },
          },
        },
      ],
      {
        'purchaseorderdetails."supplierId"': supplierId,
        'purchaseorderdetails."companyId"': companyId,
        'purchaseorderdetails."delete"': 0,
        'po."delete"': 0,
      },
      [
        'po."poNumber" AS "poNumber"',
        'po."poDate" AS "poDate"',
        'purchaseorderdetails."itemCode" AS "itemCode"',
        'purchaseorderdetails."itemName" AS "itemName"',
        'purchaseorderdetails."uom" AS "uom"',
        'purchaseorderdetails."qty" AS "qty"',
        'purchaseorderdetails."rate" AS "rate"',
        'purchaseorderdetails."total" AS "total"',
      ],
      [['po."purchaseOrderId"', "DESC"]],
      0,
      0,
    );
    return successResponse(
      res,
      details,
      "Vendor purchase history fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ---------------- GET INDENT ITEMS FOR PO (Indent Details tab) ----------------

module.exports = {
  getNextPoNumber,
  getItemSupplierInfo,
  createPurchaseOrder,
  getPurchaseOrderList,
  getPurchaseOrderById,
  getIndentItemsForPO,
  getNextSerialNo,
  getVendorHistory,
};
