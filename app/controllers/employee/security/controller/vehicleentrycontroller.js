const path = require("path");
const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
  toFullUrl,
} = require("../../../../helper/index.js");

// multer se aayi file ka relative path banane ke liye
const getFilePath = (files, field) => {
  if (files && files[field] && files[field][0]) {
    return path
      .join("Uploadimages/vehicle_entry", files[field][0].filename)
      .replace(/\\/g, "/");
  }
  return null;
};

// ===== YE FUNCTION EK ROW ke saare photo fields ko full URL me convert karta hai =====
const mapPhotoUrls = (row) => ({
  ...row,
  driverPhoto: toFullUrl(row.driverPhoto),
  rcPhoto: toFullUrl(row.rcPhoto),
  vehiclePhotoFront: toFullUrl(row.vehiclePhotoFront),
  vehiclePhotoBack: toFullUrl(row.vehiclePhotoBack),
  exitPhotoFront: toFullUrl(row.exitPhotoFront),
  exitPhotoBack: toFullUrl(row.exitPhotoBack),
});

// ---------------- CREATE ----------------
const createVehicleEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      entryDate,
      entryTime,
      vehicleType,
      vehicleNumber,
      vehicleBrand,
      driverName,
      mobileNumber,
      company,
      purpose,
      employeeToMeet,
      gateNumber,
      vehicleCondition,
      status,
    } = req.body;

    const alreadyIn = await selectWithJoins(
      "vehicleentry",
      [],
      { vehicleNumber: vehicleNumber.trim(), companyId, status: "IN", delete: 0 },
      ["vehicleEntryId"]
    );

    if (alreadyIn.length > 0) {
      return errorResponse(res, "This vehicle is already marked IN. Please mark exit first.");
    }

    const payload = {
      companyId,
      entryDate,
      entryTime,
      vehicleType,
      vehicleNumber: vehicleNumber.trim(),
      vehicleBrand: vehicleBrand || null,
      driverName,
      mobileNumber,
      company: company || null,
      purpose,
      employeeToMeet: employeeToMeet || null,
      gateNumber: gateNumber || null,
      vehicleCondition,
      status: status || "IN",
      driverPhoto: getFilePath(req.files, "driverPhoto"),
      rcPhoto: getFilePath(req.files, "rcPhoto"),
      vehiclePhotoFront: getFilePath(req.files, "vehiclePhotoFront"),
      vehiclePhotoBack: getFilePath(req.files, "vehiclePhotoBack"),
      createdBy: employeeId,
      createdType: "Security",
      delete: 0,
    };

    const entry = await saveModel("vehicleentry", payload);

    // ===== response me full URL bhejo, DB me relative hi rahega =====
    return successResponse(res, mapPhotoUrls(entry), "Vehicle entry created successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getVehicleEntryList = async (req, res) => {
  try {
    const companyId = req.companyId;
    const employeeId = req.employeeId;
    
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "vehicleentry",
      [],
      { companyId, delete: 0 },
      [
        "vehicleEntryId", "companyId", "entryDate", "entryTime", "vehicleType",
        "vehicleNumber", "vehicleBrand", "driverName", "mobileNumber", "company",
        "purpose", "employeeToMeet", "gateNumber", "vehicleCondition", "status",
        "driverPhoto", "rcPhoto", "vehiclePhotoFront", "vehiclePhotoBack",
        "exitTime", "exitVehicleCondition", "conditionChangedAtExit",
        "exitPhotoFront", "exitPhotoBack",
      ],
      [["vehicleEntryId", "DESC"]]
    );

    // ===== har row ke photo fields ko full URL me map karo =====
    return successResponse(res, list.map(mapPhotoUrls), "Vehicle entry list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getVehicleEntryById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "vehicleentry",
      [],
      { vehicleEntryId: id, companyId, delete: 0 },
      [
        "vehicleEntryId", "companyId", "entryDate", "entryTime", "vehicleType",
        "vehicleNumber", "vehicleBrand", "driverName", "mobileNumber", "company",
        "purpose", "employeeToMeet", "gateNumber", "vehicleCondition", "status",
        "driverPhoto", "rcPhoto", "vehiclePhotoFront", "vehiclePhotoBack",
        "exitTime", "exitVehicleCondition", "conditionChangedAtExit",
        "exitPhotoFront", "exitPhotoBack",
      ]
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Vehicle entry not found");
    }

    // ===== yahi wo response hai jo Edit page use karta hai — full URL yahan bhi chahiye =====
    return successResponse(res, mapPhotoUrls(rows[0]), "Vehicle entry fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE (exit se pehle edit) ----------------
const updateVehicleEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      vehicleEntryId,
      entryDate,
      entryTime,
      vehicleType,
      vehicleNumber,
      vehicleBrand,
      driverName,
      mobileNumber,
      company,
      purpose,
      employeeToMeet,
      gateNumber,
      vehicleCondition,
      status,
    } = req.body;

    const existing = await selectWithJoins(
      "vehicleentry",
      [],
      { vehicleEntryId, companyId, delete: 0 },
      ["vehicleEntryId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Vehicle entry not found");
    }

    const payload = {
      entryDate,
      entryTime,
      vehicleType,
      vehicleNumber: vehicleNumber.trim(),
      vehicleBrand: vehicleBrand || null,
      driverName,
      mobileNumber,
      company: company || null,
      purpose,
      employeeToMeet: employeeToMeet || null,
      gateNumber: gateNumber || null,
      vehicleCondition,
      status: status || "IN",
      updated: new Date(),
    };

    const driverPhoto = getFilePath(req.files, "driverPhoto");
    const rcPhoto = getFilePath(req.files, "rcPhoto");
    const vehiclePhotoFront = getFilePath(req.files, "vehiclePhotoFront");
    const vehiclePhotoBack = getFilePath(req.files, "vehiclePhotoBack");

    if (driverPhoto) payload.driverPhoto = driverPhoto;
    if (rcPhoto) payload.rcPhoto = rcPhoto;
    if (vehiclePhotoFront) payload.vehiclePhotoFront = vehiclePhotoFront;
    if (vehiclePhotoBack) payload.vehiclePhotoBack = vehiclePhotoBack;

    await updateModelHelper("vehicleentry", payload, { vehicleEntryId, companyId });

    return successResponse(res, {}, "Vehicle entry updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- EXIT (vehicle ko OUT mark karna) ----------------
const exitVehicleEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { vehicleEntryId, exitTime, exitVehicleCondition } = req.body;
    const conditionChangedAtExit =
      req.body.conditionChangedAtExit === true ||
      req.body.conditionChangedAtExit === "true";

    const existing = await selectWithJoins(
      "vehicleentry",
      [],
      { vehicleEntryId, companyId, delete: 0 },
      ["vehicleEntryId", "status"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Vehicle entry not found");
    }

    if (existing[0].status === "OUT") {
      return errorResponse(res, "This vehicle is already marked OUT.");
    }

    const exitPhotoFront = getFilePath(req.files, "exitPhotoFront");
    const exitPhotoBack = getFilePath(req.files, "exitPhotoBack");

    if (conditionChangedAtExit && (!exitPhotoFront || !exitPhotoBack)) {
      return errorResponse(
        res,
        "Front and back exit photos are required when condition changed"
      );
    }

    const payload = {
      status: "OUT",
      exitTime,
      exitVehicleCondition,
      conditionChangedAtExit,
      exitPhotoFront: conditionChangedAtExit ? exitPhotoFront : null,
      exitPhotoBack: conditionChangedAtExit ? exitPhotoBack : null,
      updated: new Date(),
    };

    await updateModelHelper("vehicleentry", payload, { vehicleEntryId, companyId });

    return successResponse(res, {}, "Vehicle exit marked successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteVehicleEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { vehicleEntryId } = req.body;

    const existing = await selectWithJoins(
      "vehicleentry",
      [],
      { vehicleEntryId, companyId, delete: 0 },
      ["vehicleEntryId"]
    );

    if (existing.length === 0) {
      return requiredmessage(res, "Vehicle entry not found");
    }

    await updateModelHelper(
      "vehicleentry",
      { delete: 1, updated: new Date() },
      { vehicleEntryId, companyId }
    );

    return successResponse(res, {}, "Vehicle entry deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createVehicleEntry,
  getVehicleEntryList,
  getVehicleEntryById,
  updateVehicleEntry,
  exitVehicleEntry,
  deleteVehicleEntry,
};