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

const MASTER_TYPES = {
  trailer: "Trailer Detail",
  chassis: "Main Chassis",
  body: "Body Details",
  hydraulic: "Hyd Kit",
  axle: "Axle",
  suspension: "Suspension",
  tyre: "Tyre",
  rim: "Rim",
  kingPin: "King Pin",
  landingLeg: "Landing Leg",
  brakeSystem: "Brake system",
  mudguard: "Mudgaurd",
  color: "Paint",
  electricalTapes: "Electrical & Reflective tapes",
  supdRupd: "SUPD & RUPD",
  box: "Tool Box",
  spareWheelCarrier: "Spare Wheel Carrier",
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const round2 = (value) => Number(Number(value || 0).toFixed(2));

// ============================================================
// VALIDATE CREATE MASTER SELECTIONS + GET PRICES
// ============================================================

// Fields not required when vehicleType = "tipper" (hidden on the frontend for Tipper)
const TIPPER_OPTIONAL_FIELDS = [
  "axle",
  "suspension",
  "tyre",
  "rim",
  "landingLeg",
  "brakeSystem",
  "electricalTapes",
  "spareWheelCarrier",
];

const getQuotationMasterPrices = async ({
  companyId,
  vehicleType,
  selections,
}) => {
  const result = {};
  let basicCost = 0;

  for (const [field, type] of Object.entries(MASTER_TYPES)) {
    // Skip these 8 fields for Tipper — they're hidden on the frontend
    if (vehicleType === "tipper" && TIPPER_OPTIONAL_FIELDS.includes(field)) {
      result[field] = null;
      continue;
    }

    const masterId = normalizeId(selections[field]);

    if (!masterId) {
      throw new Error(`${type} selection is required.`);
    }

    const rows = await selectWithJoins(
      "createmaster",
      [],
      {
        createMasterId: masterId,
        companyId,
        delete: 0,
        status: "active",
      },
      ["createMasterId", "companyId", "type", "description", "exShowroom"],
    );

    // Match type case-insensitively (DB data may have inconsistent casing,
    // e.g. "Brake System" vs "Brake system"), same as frontend's getMasterOptions()
    const master = rows.find(
      (row) => row.type?.trim().toLowerCase() === type.trim().toLowerCase(),
    );

    if (!master) {
      throw new Error(
        `Invalid ${type} selected. Please select a valid active master item.`,
      );
    }

    const price = Number(master.exShowroom) || 0;

    result[field] = master.createMasterId;
    result[`${field}Description`] = master.description;
    result[`${field}Price`] = price;

    basicCost += price;
  }

  return {
    selections: result,
    basicCost: round2(basicCost),
  };
};

// ============================================================
// CALCULATE QUOTATION AMOUNTS
// ============================================================

const calculateQuotationAmount = ({
  basicCost,
  discountType,
  discountValue,
}) => {
  const discountNum = Number(discountValue) || 0;

  let discountAmount = 0;

  if (discountType === "percentage") {
    discountAmount = (basicCost * discountNum) / 100;
  } else {
    discountAmount = discountNum;
  }

  // Discount cannot exceed basic cost
  discountAmount = Math.min(discountAmount, basicCost);

  const afterDiscount = Math.max(0, basicCost - discountAmount);

  const gstAmount = afterDiscount * 0.18;

  const finalPrice = afterDiscount + gstAmount;

  return {
    discountAmount: round2(discountAmount),
    basicCost: round2(basicCost),
    gstAmount: round2(gstAmount),
    finalPrice: round2(finalPrice),
  };
};

// ============================================================
// GET NEXT QUOTATION NO
// ============================================================

const getNextQuotationNo = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { financialYearId } = req.query;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found in session. Please select a company year.",
      );
    }

    const { billNo, fyLabel } = await generateVoucherNo({
      companyId,
      financialYearId,
      tableName: "quotation",
      idColumn: "quotationId",
      prefixFor: "QUOTATION",
    });

    return successResponse(
      res,
      {
        qNo: billNo,
        fyLabel,
        financialYearId,
      },
      "Quotation number generated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// CREATE QUOTATION
// ============================================================

const createQuotation = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      financialYearId,

      leadId,

      customerName,
      mobile,
      email,
      address,
      city,
      model,
      remark,

      vehicleType,

      trailer,
      chassis,
      body,
      hydraulic,
      axle,
      suspension,
      tyre,
      rim,
      kingPin,
      landingLeg,
      brakeSystem,
      mudguard,
      color,
      electricalTapes,
      supdRupd,
      box,
      spareWheelCarrier,

      warranty,

      discountType,
      discountValue,

      position,
      createdBy,
      createdType,
    } = req.body;

        // --------------------------------------------------------
    // Trailer-only fields required only when vehicleType = trailer
    // --------------------------------------------------------

    const TRAILER_ONLY_FIELDS = {
      axle: "Axle",
      suspension: "Suspension",
      tyre: "Tyre",
      rim: "Rim",
      landingLeg: "Landing Leg",
      brakeSystem: "Brake System",
      electricalTapes: "Electrical & Reflective Tapes",
      spareWheelCarrier: "Spare Wheel Carrier",
    };

    if (vehicleType === "trailer") {
      const fieldValues = {
        axle,
        suspension,
        tyre,
        rim,
        landingLeg,
        brakeSystem,
        electricalTapes,
        spareWheelCarrier,
      };

      for (const [field, label] of Object.entries(TRAILER_ONLY_FIELDS)) {
        if (!normalizeId(fieldValues[field])) {
          return errorResponse(res, `${label} is required.`);
        }
      }
    }

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found in session. Please select a company year.",
      );
    }

    const fy = await getFinancialYearById(financialYearId, companyId);

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    const { billNo } = await generateVoucherNo({
      companyId,
      financialYearId: fy.financialYearId,
      tableName: "quotation",
      idColumn: "quotationId",
      prefixFor: "QUOTATION",
    });

    const qNo = billNo;

    // --------------------------------------------------------
    // QUOTATION NO DUPLICATE
    // --------------------------------------------------------

    const duplicate = await selectWithJoins(
      "quotation",
      [],
      {
        companyId,
        financialYearId: fy.financialYearId,
        qNo,
        delete: 0,
      },
      ["quotationId"],
    );

    if (duplicate.length > 0) {
      return errorResponse(res, "This Quotation No already exists.");
    }

    const finalDiscountType =
      discountType === "percentage" ? "percentage" : "amount";

    const finalDiscountValue = Number(discountValue) || 0;

    // --------------------------------------------------------
    // CREATE MASTER VALIDATION + PRICE CALCULATION
    // --------------------------------------------------------

    const masterResult = await getQuotationMasterPrices({
      companyId,
      vehicleType,
      selections: {
        trailer,
        chassis,
        body,
        hydraulic,
        axle,
        suspension,
        tyre,
        rim,
        kingPin,
        landingLeg,
        brakeSystem,
        mudguard,
        color,
        electricalTapes,
        supdRupd,
        box,
        spareWheelCarrier,
      },
    });

    const amounts = calculateQuotationAmount({
      basicCost: masterResult.basicCost,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
    });

    // --------------------------------------------------------
    // WARRANTY
    // --------------------------------------------------------

    let warrantyValue = warranty || "";

    if (warranty && typeof warranty === "object") {
      warrantyValue = JSON.stringify(warranty);
    }

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const quotation = await saveModel("quotation", {
      companyId,
      financialYearId: fy.financialYearId,
      qNo,
      leadId,

      customerName,
      mobile,
      email: email || null,
      address: address || null,
      city: city || null,
      model: model || null,
      remark: remark || null,

      vehicleType,

      trailer: masterResult.selections.trailer,
      chassis: masterResult.selections.chassis,
      body: masterResult.selections.body,
      hydraulic: masterResult.selections.hydraulic,
      axle: masterResult.selections.axle,
      suspension: masterResult.selections.suspension,
      tyre: masterResult.selections.tyre,
      rim: masterResult.selections.rim,
      kingPin: masterResult.selections.kingPin,
      landingLeg: masterResult.selections.landingLeg,
      brakeSystem: masterResult.selections.brakeSystem,
      mudguard: masterResult.selections.mudguard,
      color: masterResult.selections.color,
      electricalTapes: masterResult.selections.electricalTapes,
      supdRupd: masterResult.selections.supdRupd,
      box: masterResult.selections.box,
      spareWheelCarrier: masterResult.selections.spareWheelCarrier,

      warranty: warrantyValue,

      discountType: finalDiscountType,
      discountValue: finalDiscountValue,

      basicCost: amounts.basicCost,
      gstAmount: amounts.gstAmount,
      finalPrice: amounts.finalPrice,

      position: position || null,

      createdBy: req.employeeId ? String(req.employeeId) : createdBy || null,
      createdtype: req.employeeId ? "Sale Executive" : createdType || null,

      delete: 0,
    });

    return successResponse(
      res,
      {
        quotationId: quotation.quotationId,
        qNo,
        basicCost: amounts.basicCost,
        discountAmount: amounts.discountAmount,
        gstAmount: amounts.gstAmount,
        finalPrice: amounts.finalPrice,
      },
      "Quotation saved successfully",
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This Quotation No already exists.");
    }

    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET QUOTATION LIST
// ============================================================

const getQuotationList = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { financialYearId, role } = req.query;
    const branchId = req.branchId;
    const employeeId = req.employeeId;

    // base filter — company + not-deleted
    const quotationWhere = {
      companyId,
      delete: 0,
    };

    // Employee panel requests always carry req.employeeId (set by employeeAuth) —
    // trust that over any frontend-supplied role, and scope strictly to this employee.
    if (employeeId) {
      quotationWhere.createdBy = String(employeeId);
      quotationWhere.createdtype = "Sale Executive";
    } else if (role === "Branch") {
      if (!branchId) return requiredmessage(res, "Branch not found.");
      quotationWhere.branchId = branchId;
    }
    // Super Admin (or admin panel with no role) → no extra filter, sees everything
    if (financialYearId) {
      quotationWhere.financialYearId = financialYearId;
    }

    const quotations = await selectWithJoins(
      "quotation",
      [],
      quotationWhere,
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
        "trailer",
        "chassis",
        "body",
        "hydraulic",
        "axle",
        "suspension",
        "tyre",
        "rim",
        "kingPin",
        "landingLeg",
        "brakeSystem",
        "mudguard",
        "color",
        "electricalTapes",
        "supdRupd",
        "box",
        "spareWheelCarrier",
        "warranty",
        "discountType",
        "discountValue",
        "basicCost",
        "gstAmount",
        "finalPrice",
        "position",
        "createdBy",
        "createdtype",
        "created",
        "updated",
      ],
      [["quotationId", "DESC"]],
    );

    if (!quotations.length) {
      return successResponse(res, [], "Quotation list fetched successfully");
    }

    // ✅ Get employee IDs - only numeric values (skip "Admin")
    const employeeIds = quotations
      .map(q => q.createdBy)
      .filter(id => id && id !== "" && id !== "Admin" && !isNaN(Number(id)));

    let employeeMap = {};

    if (employeeIds.length > 0) {
      try {
        const employees = await selectWithJoins(
          "employee",
          [],
          { employeeId: employeeIds },
          ["employeeId", "employeeName"],
        );
        
        employeeMap = employees.reduce((map, emp) => {
          map[String(emp.employeeId)] = emp.employeeName || String(emp.employeeId);
          return map;
        }, {});
      } catch (err) {
        console.error("Error fetching employees:", err.message);
      }
    }

    const data = quotations.map((quotation) => {
      // ✅ Handle different createdBy values
      let createdByName = quotation.createdBy || "";
      
      if (createdByName === "Admin") {
        createdByName = "Admin";
      } else if (!isNaN(Number(createdByName)) && employeeMap[String(createdByName)]) {
        createdByName = employeeMap[String(createdByName)];
      }
      
      return {
        id: String(quotation.quotationId),
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
        vehicleType: quotation.vehicleType,
        trailer: quotation.trailer,
        chassis: quotation.chassis,
        body: quotation.body,
        hydraulic: quotation.hydraulic,
        axle: quotation.axle,
        suspension: quotation.suspension,
        tyre: quotation.tyre,
        rim: quotation.rim,
        kingPin: quotation.kingPin,
        landingLeg: quotation.landingLeg,
        brakeSystem: quotation.brakeSystem,
        mudguard: quotation.mudguard,
        color: quotation.color,
        electricalTapes: quotation.electricalTapes,
        supdRupd: quotation.supdRupd,
        box: quotation.box,
        spareWheelCarrier: quotation.spareWheelCarrier,
        warranty: quotation.warranty || "",
        discountType: quotation.discountType,
        discountValue: String(quotation.discountValue || 0),
        basicCost: String(quotation.basicCost || 0),
        gstAmount: String(quotation.gstAmount || 0),
        finalPrice: String(quotation.finalPrice || 0),
        position: quotation.position || "",
        createdBy: createdByName,  // ✅ Now shows "Admin" or employee name
        createdType: quotation.createdtype || "",
        createdAt: quotation.created,
        updatedAt: quotation.updated,
      };
    });

    return successResponse(res, data, "Quotation list fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// GET QUOTATION BY ID
// ============================================================

const getQuotationById = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Quotation id is required.");
    }

    const rows = await selectWithJoins(
      "quotation",
      [],
      {
        quotationId: id,
        companyId,
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

        "vehicleType",

        "trailer",
        "chassis",
        "body",
        "hydraulic",
        "axle",
        "suspension",
        "tyre",
        "rim",
        "kingPin",
        "landingLeg",
        "brakeSystem",
        "mudguard",
        "color",
        "electricalTapes",
        "supdRupd",
        "box",
        "spareWheelCarrier",

        "warranty",

        "discountType",
        "discountValue",

        "basicCost",
        "gstAmount",
        "finalPrice",

        "position",
        "createdBy",

        "created",
        "updated",
      ],
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Quotation not found.");
    }

    const quotation = rows[0];

    return successResponse(
      res,
      {
        id: String(quotation.quotationId),

        qNo: quotation.qNo,
        leadId: quotation.leadId,

        customerName: quotation.customerName,
        mobile: quotation.mobile,
        email: quotation.email,
        address: quotation.address,
        city: quotation.city,
        model: quotation.model,
        remark: quotation.remark,

        vehicleType: quotation.vehicleType,

        trailer: quotation.trailer,
        chassis: quotation.chassis,
        body: quotation.body,
        hydraulic: quotation.hydraulic,
        axle: quotation.axle,
        suspension: quotation.suspension,
        tyre: quotation.tyre,
        rim: quotation.rim,
        kingPin: quotation.kingPin,
        landingLeg: quotation.landingLeg,
        brakeSystem: quotation.brakeSystem,
        mudguard: quotation.mudguard,
        color: quotation.color,
        electricalTapes: quotation.electricalTapes,
        supdRupd: quotation.supdRupd,
        box: quotation.box,
        spareWheelCarrier: quotation.spareWheelCarrier,

        warranty: quotation.warranty || "",

        discountType: quotation.discountType,
        discountValue: String(quotation.discountValue || 0),

        basicCost: String(quotation.basicCost || 0),
        gstAmount: String(quotation.gstAmount || 0),
        finalPrice: String(quotation.finalPrice || 0),

        position: quotation.position || "",
        createdBy: quotation.createdBy || "",

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
// UPDATE QUOTATION
// ============================================================

const updateQuotation = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Quotation id is required.");
    }

    // --------------------------------------------------------
    // EXISTING QUOTATION
    // --------------------------------------------------------

    const existingRows = await selectWithJoins(
      "quotation",
      [],
      {
        quotationId: id,
        companyId,
        delete: 0,
      },
      ["quotationId", "qNo"],
    );

    if (existingRows.length === 0) {
      return requiredmessage(res, "Quotation not found.");
    }

    const qNo = existingRows[0].qNo;

    const {
      financialYearId,
      leadId,
      customerName,
      mobile,
      email,
      address,
      city,
      model,
      remark,

      vehicleType,

      trailer,
      chassis,
      body,
      hydraulic,
      axle,
      suspension,
      tyre,
      rim,
      kingPin,
      landingLeg,
      brakeSystem,
      mudguard,
      color,
      electricalTapes,
      supdRupd,
      box,
      spareWheelCarrier,

      warranty,

      discountType,
      discountValue,

      position,

      createdBy,
      createdType,
    } = req.body;






        // --------------------------------------------------------
    // Trailer-only fields required only when vehicleType = trailer
    // --------------------------------------------------------

    const TRAILER_ONLY_FIELDS = {
      axle: "Axle",
      suspension: "Suspension",
      tyre: "Tyre",
      rim: "Rim",
      landingLeg: "Landing Leg",
      brakeSystem: "Brake System",
      electricalTapes: "Electrical & Reflective Tapes",
      spareWheelCarrier: "Spare Wheel Carrier",
    };

    if (vehicleType === "trailer") {
      const fieldValues = {
        axle,
        suspension,
        tyre,
        rim,
        landingLeg,
        brakeSystem,
        electricalTapes,
        spareWheelCarrier,
      };

      for (const [field, label] of Object.entries(TRAILER_ONLY_FIELDS)) {
        if (!normalizeId(fieldValues[field])) {
          return errorResponse(res, `${label} is required.`);
        }
      }
    }

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!leadId) {
      return errorResponse(res, "Lead is required.");
    }

    if (!customerName) {
      return errorResponse(res, "Customer name is required.");
    }

    if (!mobile) {
      return errorResponse(res, "Mobile is required.");
    }

    if (!["tipper", "trailer"].includes(vehicleType)) {
      return errorResponse(
        res,
        "Vehicle type must be either tipper or trailer.",
      );
    }

    if (!financialYearId) {
      return errorResponse(
        res,
        "Financial Year not found in session. Please select a company year.",
      );
    }

    const fy = await getFinancialYearById(financialYearId, companyId);

    if (!fy) {
      return errorResponse(res, "Invalid Financial Year.");
    }

    // --------------------------------------------------------
    // DISCOUNT
    // --------------------------------------------------------

    const finalDiscountType =
      discountType === "percentage" ? "percentage" : "amount";

    const finalDiscountValue = Number(discountValue) || 0;

    // --------------------------------------------------------
    // MASTER VALIDATION + PRICE
    // --------------------------------------------------------

    const masterResult = await getQuotationMasterPrices({
      companyId,
      vehicleType,
      selections: {
        trailer,
        chassis,
        body,
        hydraulic,
        axle,
        suspension,
        tyre,
        rim,
        kingPin,
        landingLeg,
        brakeSystem,
        mudguard,
        color,
        electricalTapes,
        supdRupd,
        box,
        spareWheelCarrier,
      },
    });

    const amounts = calculateQuotationAmount({
      basicCost: masterResult.basicCost,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
    });

    // --------------------------------------------------------
    // WARRANTY
    // --------------------------------------------------------

    let warrantyValue = warranty || "";

    if (warranty && typeof warranty === "object") {
      warrantyValue = JSON.stringify(warranty);
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    await updateModelHelper(
      "quotation",
      {
        financialYearId: fy.financialYearId,

        qNo,
        leadId,

        customerName,
        mobile,
        email: email || null,
        address: address || null,
        city: city || null,
        model: model || null,
        remark: remark || null,

        vehicleType,

        trailer: masterResult.selections.trailer,
        chassis: masterResult.selections.chassis,
        body: masterResult.selections.body,
        hydraulic: masterResult.selections.hydraulic,
        axle: masterResult.selections.axle,
        suspension: masterResult.selections.suspension,
        tyre: masterResult.selections.tyre,
        rim: masterResult.selections.rim,
        kingPin: masterResult.selections.kingPin,
        landingLeg: masterResult.selections.landingLeg,
        brakeSystem: masterResult.selections.brakeSystem,
        mudguard: masterResult.selections.mudguard,
        color: masterResult.selections.color,
        electricalTapes: masterResult.selections.electricalTapes,
        supdRupd: masterResult.selections.supdRupd,
        box: masterResult.selections.box,
        spareWheelCarrier: masterResult.selections.spareWheelCarrier,

        warranty: warrantyValue,

        discountType: finalDiscountType,
        discountValue: finalDiscountValue,

        basicCost: amounts.basicCost,
        gstAmount: amounts.gstAmount,
        finalPrice: amounts.finalPrice,

        position: position || null,

        createdBy: req.employeeId ? String(req.employeeId) : createdBy || null,
        createdtype: req.employeeId ? "Sale Executive" : createdType || null,

        updated: new Date(),
      },
      {
        quotationId: id,
        companyId,
        delete: 0,
      },
    );

    return successResponse(
      res,
      {
        quotationId: Number(id),
        qNo,
        basicCost: amounts.basicCost,
        discountAmount: amounts.discountAmount,
        gstAmount: amounts.gstAmount,
        finalPrice: amounts.finalPrice,
      },
      "Quotation updated successfully",
    );
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return errorResponse(res, "This Quotation No already exists.");
    }

    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

// ============================================================
// DELETE QUOTATION
// ============================================================

const deleteQuotation = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Quotation id is required.");
    }

    const existing = await selectWithJoins(
      "quotation",
      [],
      {
        quotationId: id,
        companyId,
        delete: 0,
      },
      ["quotationId"],
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Quotation not found.");
    }

    await updateModelHelper(
      "quotation",
      {
        delete: 1,
        updated: new Date(),
      },
      {
        quotationId: id,
        companyId,
      },
    );

    return successResponse(
      res,
      {
        quotationId: Number(id),
      },
      "Quotation deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message || "Something Went Wrong", error);
  }
};

module.exports = {
  getNextQuotationNo,
  createQuotation,
  getQuotationList,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
};
