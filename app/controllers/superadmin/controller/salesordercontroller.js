
const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
} = require("../../../helper/index.js");

const { getFinancialYearById } = require("../../../helper/financialYear.js");
const { generateVoucherNo } = require("../../../helper/billNoGenerator.js");

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

// ============================================================
// GET NEXT SALES ORDER NO
// ============================================================

const getNextSalesOrderNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found. Please select a company year.",
      );
    }

    const fy = await getFinancialYearById(
      financialYearId,
      companyId,
    );

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "salesorder",
      idColumn: "salesOrderId",
      prefixFor: "SALESORDER",
    });

    return successResponse(
      res,
      {
        soNo: billNo,
        fyLabel,
        financialYearId: fy.financialYearId,
      },
      "Sales Order number generated successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error,
    );
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

    const rows = await selectWithJoins(
      "quotation",
      [],
      where,
      [
        "quotationId",
        "financialYearId",
        "qNo",
        "leadId",

        "customerName",
        "mobile",
        "email",
        "address",
        "city",
        "model",
        "remark",

        "vehicleType",

        "basicCost",
        "gstAmount",
        "finalPrice",

        "createdBy",
        "createdtype",
        "created",
        "updated",
      ],
    );

    if (!rows.length) {
      return requiredmessage(res, "Quotation not found.");
    }

    const quotation = rows[0];

    return successResponse(
      res,
      {
        id: String(quotation.quotationId),

        quotationId: quotation.quotationId,
        financialYearId: quotation.financialYearId,
        qNo: quotation.qNo,

        leadId: quotation.leadId,

        customerName: quotation.customerName || "",
        mobile: quotation.mobile || "",
        email: quotation.email || "",
        address: quotation.address || "",
        city: quotation.city || "",
        model: quotation.model || "",
        remark: quotation.remark || "",

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
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error,
    );
  }
};

// ============================================================
// CREATE SALES ORDER
// ============================================================

const createSalesOrder = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      financialYearId,
      quotationId,
      leadId,

      mode,

      customerName,
      mobile,
      email,
      address,
      city,
      model,
      remark,

      qty,
      unitPrice,
      totalAmount,

      aadharNumber,
      panNumber,
      gstNumber,

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

    if (!["asIs", "manual"].includes(mode)) {
      return errorResponse(
        res,
        "Mode must be either As Its or Manual.",
      );
    }

    if (!customerName || !String(customerName).trim()) {
      return errorResponse(res, "Customer name is required.");
    }

    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, "Client number is required.");
    }

    const fy = await getFinancialYearById(
      financialYearId,
      companyId,
    );

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
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
      [
        "quotationId",
        "qNo",
        "leadId",
        "customerName",
        "mobile",
        "email",
        "address",
        "city",
        "model",
        "remark",
        "finalPrice",
      ],
    );

    if (!quotationRows.length) {
      return errorResponse(
        res,
        "Selected quotation was not found.",
      );
    }

    const quotation = quotationRows[0];

    // ========================================================
    // CHECK LEAD MATCH
    // ========================================================

    if (
      normalizeId(leadId) !==
      normalizeId(quotation.leadId)
    ) {
      return errorResponse(
        res,
        "Selected lead does not belong to this quotation.",
      );
    }

    // ========================================================
    // CHECK DUPLICATE SALES ORDER FOR QUOTATION
    // ========================================================

    const duplicate = await selectWithJoins(
      "salesorder",
      [],
      {
        companyId,
        quotationId,
        delete: 0,
      },
      ["salesOrderId", "soNo"],
    );

    if (duplicate.length > 0) {
      return errorResponse(
        res,
        `Sales Order already exists for this quotation (${duplicate[0].soNo}).`,
      );
    }

    // ========================================================
    // QUANTITY / AMOUNT
    // ========================================================

    const finalQty = Number(qty) || 0;
    const finalUnitPrice = Number(unitPrice) || 0;

    if (finalQty <= 0) {
      return errorResponse(
        res,
        "Quantity must be greater than 0.",
      );
    }

    if (finalUnitPrice < 0) {
      return errorResponse(
        res,
        "Amount cannot be negative.",
      );
    }

    const calculatedTotalAmount = round2(
      finalQty * finalUnitPrice,
    );

    // Do not trust frontend totalAmount.
    const finalTotalAmount = calculatedTotalAmount;

    // ========================================================
    // GENERATE SALES ORDER NUMBER
    // ========================================================

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "salesorder",
      idColumn: "salesOrderId",
      prefixFor: "SALESORDER",
    });

    const soNo = billNo;

    // ========================================================
    // DUPLICATE SO NUMBER
    // ========================================================

    const duplicateSoNo = await selectWithJoins(
      "salesorder",
      [],
      {
        companyId,
        financialYearId: fy.financialYearId,
        soNo,
        delete: 0,
      },
      ["salesOrderId"],
    );

    if (duplicateSoNo.length > 0) {
      return errorResponse(
        res,
        "This Sales Order No already exists.",
      );
    }

    // ========================================================
    // SAVE
    // ========================================================

    const salesOrder = await saveModel(
      "salesorder",
      {
        companyId,
        financialYearId: fy.financialYearId,

        // salesOrderNo: soNo,
        soNo,

        quotationId: quotation.quotationId,
        leadId,

        mode,

        customerName: String(customerName).trim(),
        mobile: String(mobile).trim(),
        email: email || null,
        address: address || null,
        city: city || null,
        model: model || null,
        remark: remark || null,

        qty: finalQty,
        unitPrice: finalUnitPrice,
        totalAmount: finalTotalAmount,

        aadharNumber: aadharNumber || null,
        panNumber: panNumber || null,
        gstNumber: gstNumber || null,

        createdBy: req.employeeId
          ? String(req.employeeId)
          : createdBy || null,

        createdtype: req.employeeId
          ? "Sale Executive"
          : createdType || null,

        delete: 0,
      },
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    return successResponse(
      res,
      {
        salesOrderId: salesOrder.salesOrderId,
        soNo,

        quotationId: quotation.quotationId,
        qNo: quotation.qNo,

        leadId,

        mode,

        customerName,
        mobile,
        email: email || "",
        address: address || "",
        city: city || "",
        model: model || "",
        remark: remark || "",

        qty: finalQty,
        unitPrice: finalUnitPrice,
        totalAmount: finalTotalAmount,
      },
      "Sales Order saved successfully",
    );
  } catch (error) {
    if (
      error?.name === "SequelizeUniqueConstraintError"
    ) {
      return errorResponse(
        res,
        "This Sales Order already exists.",
      );
    }

    return errorResponse(
      res,
      error.message || "Something Went Wrong",
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

    const salesOrders = await selectWithJoins(
      "salesorder",
      [],
      salesOrderWhere,
      [
        "salesOrderId",
        "companyId",
        "financialYearId",

        "soNo",
        // "salesOrderNo",

        "quotationId",
        "leadId",

        "mode",

        "customerName",
        "mobile",
        "email",
        "address",
        "city",
        "model",
        "remark",

        "qty",
        "unitPrice",
        "totalAmount",

        "aadharNumber",
        "aadharImage",
        "panNumber",
        "panImage",
        "gstNumber",
        "gstImage",

        "createdBy",
        "createdtype",

        "created",
        "updated",
      ],
      [["salesOrderId", "DESC"]],
    );

    if (!salesOrders.length) {
      return successResponse(
        res,
        [],
        "Sales Order list fetched successfully",
      );
    }

    // ========================================================
    // GET EMPLOYEE IDS
    // ========================================================

    const employeeIds = salesOrders
      .map((item) => item.createdBy)
      .filter(
        (id) =>
          id &&
          id !== "" &&
          id !== "Admin" &&
          !isNaN(Number(id)),
      );

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

        employeeMap = employees.reduce(
          (map, emp) => {
            map[String(emp.employeeId)] =
              emp.employeeName ||
              String(emp.employeeId);

            return map;
          },
          {},
        );
      } catch (err) {
        console.error(
          "Error fetching employees:",
          err.message,
        );
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

        quotationMap = quotations.reduce(
          (map, quotation) => {
            map[String(quotation.quotationId)] =
              quotation.qNo || "";

            return map;
          },
          {},
        );
      } catch (err) {
        console.error(
          "Error fetching quotations:",
          err.message,
        );
      }
    }

    // ========================================================
    // FORMAT RESPONSE
    // ========================================================

    const data = salesOrders.map((salesOrder) => {
      let createdByName =
        salesOrder.createdBy || "";

      if (createdByName === "Admin") {
        createdByName = "Admin";
      } else if (
        !isNaN(Number(createdByName)) &&
        employeeMap[String(createdByName)]
      ) {
        createdByName =
          employeeMap[String(createdByName)];
      }

      return {
        id: String(salesOrder.salesOrderId),

        financialYearId:
          salesOrder.financialYearId,

        soNo:
          salesOrder.soNo || "",
        //   salesOrder.salesOrderNo ||
         

        quotationId:
          String(salesOrder.quotationId || ""),

        qNo:
          quotationMap[
            String(salesOrder.quotationId)
          ] || "",

        leadId: salesOrder.leadId,

        mode: salesOrder.mode || "asIs",

        customerName:
          salesOrder.customerName || "",

        mobile:
          salesOrder.mobile || "",

        email:
          salesOrder.email || "",

        address:
          salesOrder.address || "",

        city:
          salesOrder.city || "",

        model:
          salesOrder.model || "",

        remark:
          salesOrder.remark || "",

        qty:
          Number(salesOrder.qty) || 0,

        unitPrice:
          Number(salesOrder.unitPrice) || 0,

        totalAmount:
          Number(salesOrder.totalAmount) || 0,

        aadharNumber:
          salesOrder.aadharNumber || "",

        aadharImage:
          salesOrder.aadharImage || "",

        panNumber:
          salesOrder.panNumber || "",

        panImage:
          salesOrder.panImage || "",

        gstNumber:
          salesOrder.gstNumber || "",

        gstImage:
          salesOrder.gstImage || "",

        createdBy: createdByName,

        createdType:
          salesOrder.createdtype || "",

        createdAt:
          salesOrder.created,

        updatedAt:
          salesOrder.updated,
      };
    });

    return successResponse(
      res,
      data,
      "Sales Order list fetched successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error,
    );
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
      return errorResponse(
        res,
        "Sales Order id is required.",
      );
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
        // "salesOrderNo",

        "quotationId",
        "leadId",

        "mode",

        "customerName",
        "mobile",
        "email",
        "address",
        "city",
        "model",
        "remark",

        "qty",
        "unitPrice",
        "totalAmount",

        "aadharNumber",
        "aadharImage",
        "panNumber",
        "panImage",
        "gstNumber",
        "gstImage",

        "createdBy",
        "createdtype",

        "created",
        "updated",
      ],
    );

    if (!rows.length) {
      return requiredmessage(
        res,
        "Sales Order not found.",
      );
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

    return successResponse(
      res,
      {
        id: String(salesOrder.salesOrderId),

        financialYearId:
          salesOrder.financialYearId,

        soNo:
          salesOrder.soNo ||"",
        //   salesOrder.salesOrderNo ||
          

        quotationId:
          String(salesOrder.quotationId || ""),

        qNo,

        leadId:
          salesOrder.leadId,

        mode:
          salesOrder.mode || "asIs",

        customerName:
          salesOrder.customerName || "",

        mobile:
          salesOrder.mobile || "",

        email:
          salesOrder.email || "",

        address:
          salesOrder.address || "",

        city:
          salesOrder.city || "",

        model:
          salesOrder.model || "",

        remark:
          salesOrder.remark || "",

        qty:
          Number(salesOrder.qty) || 0,

        unitPrice:
          Number(salesOrder.unitPrice) || 0,

        totalAmount:
          Number(salesOrder.totalAmount) || 0,

        aadharNumber:
          salesOrder.aadharNumber || "",

        aadharImage:
          salesOrder.aadharImage || "",

        panNumber:
          salesOrder.panNumber || "",

        panImage:
          salesOrder.panImage || "",

        gstNumber:
          salesOrder.gstNumber || "",

        gstImage:
          salesOrder.gstImage || "",

        createdBy:
          salesOrder.createdBy || "",

        createdType:
          salesOrder.createdtype || "",

        createdAt:
          salesOrder.created,

        updatedAt:
          salesOrder.updated,
      },
      "Sales Order fetched successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error,
    );
  }
};

// ============================================================
// UPDATE SALES ORDER
// ============================================================

const updateSalesOrder = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(
        res,
        "Sales Order id is required.",
      );
    }

    // ========================================================
    // EXISTING SALES ORDER
    // ========================================================

    const existingRows = await selectWithJoins(
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
        "aadharImage",
        "panImage",
        "gstImage",
      ],
    );

    if (!existingRows.length) {
      return requiredmessage(
        res,
        "Sales Order not found.",
      );
    }

    const existing = existingRows[0];

    const {
      financialYearId,
      quotationId,
      leadId,

      mode,

      customerName,
      mobile,
      email,
      address,
      city,
      model,
      remark,

      qty,
      unitPrice,

      aadharNumber,
      panNumber,
      gstNumber,

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
      return errorResponse(
        res,
        "Please select a quotation.",
      );
    }

    if (!normalizeId(leadId)) {
      return errorResponse(
        res,
        "Please select a lead.",
      );
    }

    if (!["asIs", "manual"].includes(mode)) {
      return errorResponse(
        res,
        "Mode must be either As Its or Manual.",
      );
    }

    if (!customerName || !String(customerName).trim()) {
      return errorResponse(
        res,
        "Customer name is required.",
      );
    }

    if (!mobile || !String(mobile).trim()) {
      return errorResponse(
        res,
        "Client number is required.",
      );
    }

    const fy = await getFinancialYearById(
      financialYearId,
      companyId,
    );

    if (!fy) {
      return errorResponse(
        res,
        "Invalid Financial Year.",
      );
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
      [
        "quotationId",
        "qNo",
        "leadId",
        "customerName",
        "mobile",
        "email",
        "address",
        "city",
        "model",
        "remark",
        "finalPrice",
      ],
    );

    if (!quotationRows.length) {
      return errorResponse(
        res,
        "Selected quotation was not found.",
      );
    }

    const quotation = quotationRows[0];

    if (
      normalizeId(leadId) !==
      normalizeId(quotation.leadId)
    ) {
      return errorResponse(
        res,
        "Selected lead does not belong to this quotation.",
      );
    }

    // ========================================================
    // DUPLICATE QUOTATION
    // ========================================================

    const duplicate = await selectWithJoins(
      "salesorder",
      [],
      {
        companyId,
        quotationId,
        delete: 0,
      },
      ["salesOrderId"],
    );

    const anotherSalesOrder = duplicate.find(
      (item) =>
        String(item.salesOrderId) !== String(id),
    );

    if (anotherSalesOrder) {
      return errorResponse(
        res,
        "Another Sales Order already exists for this quotation.",
      );
    }

    // ========================================================
    // AMOUNT
    // ========================================================

    const finalQty = Number(qty) || 0;
    const finalUnitPrice = Number(unitPrice) || 0;

    if (finalQty <= 0) {
      return errorResponse(
        res,
        "Quantity must be greater than 0.",
      );
    }

    if (finalUnitPrice < 0) {
      return errorResponse(
        res,
        "Amount cannot be negative.",
      );
    }

    const finalTotalAmount = round2(
      finalQty * finalUnitPrice,
    );

    // ========================================================
    // UPDATE DATA
    // ========================================================

    const updateData = {
      financialYearId: fy.financialYearId,

      quotationId: quotation.quotationId,
      leadId,

      mode,

      customerName: String(customerName).trim(),
      mobile: String(mobile).trim(),
      email: email || null,
      address: address || null,
      city: city || null,
      model: model || null,
      remark: remark || null,

      qty: finalQty,
      unitPrice: finalUnitPrice,
      totalAmount: finalTotalAmount,

      aadharNumber: aadharNumber || null,
      panNumber: panNumber || null,
      gstNumber: gstNumber || null,

      createdBy: req.employeeId
        ? String(req.employeeId)
        : createdBy || null,

      createdtype: req.employeeId
        ? "Sale Executive"
        : createdType || null,

      updated: new Date(),
    };

    // ========================================================
    // UPDATE
    // ========================================================

    await updateModelHelper(
      "salesorder",
      updateData,
      {
        salesOrderId: id,
        companyId,
        delete: 0,
      },
    );

    return successResponse(
      res,
      {
        salesOrderId: Number(id),

        soNo: existing.soNo,

        quotationId: quotation.quotationId,
        qNo: quotation.qNo,

        leadId,

        mode,

        customerName,
        mobile,
        email: email || "",
        address: address || "",
        city: city || "",
        model: model || "",
        remark: remark || "",

        qty: finalQty,
        unitPrice: finalUnitPrice,
        totalAmount: finalTotalAmount,
      },
      "Sales Order updated successfully",
    );
  } catch (error) {
    if (
      error?.name === "SequelizeUniqueConstraintError"
    ) {
      return errorResponse(
        res,
        "This Sales Order already exists.",
      );
    }

    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error,
    );
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
      return errorResponse(
        res,
        "Sales Order id is required.",
      );
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
      return requiredmessage(
        res,
        "Sales Order not found.",
      );
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
    return errorResponse(
      res,
      error.message || "Something Went Wrong",
      error,
    );
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
};
