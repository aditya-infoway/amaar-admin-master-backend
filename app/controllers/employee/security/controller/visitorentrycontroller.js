const path = require("path");
const {
  successResponse,
  errorResponse,
  requiredmessage,
  saveModel,
  updateModel: updateModelHelper,
  selectWithJoins,
  getBlobTempPublicUrl,
  toFullUrl,
} = require("../../../../helper/index.js");

// multer se aayi file ka relative path banane ke liye
const getFilePath = (files, field) => {
  if (files && files[field] && files[field][0]) {
    return path
      .join("Uploadimages/visitor_entry", files[field][0].filename)
      .replace(/\\/g, "/");
  }
  return null;
};

const mapPhotoUrls = (row) => ({
  ...row,
  idFrontPhoto: toFullUrl(row.idFrontPhoto),
  idBackPhoto: toFullUrl(row.idBackPhoto),
  visitorPhoto: toFullUrl(row.visitorPhoto),
});

const SELECT_FIELDS = [
  "visitorEntryId", "visitorId", "fullName", "gender", "mobileNumber", "email",
  "company", "address", "country", "state", "city", "pincode",
  "idProofType", "idProofNumber", "idFrontPhoto", "idBackPhoto",
  "visitDate", "entryTime", "exitTime", "purpose", "department", "personToMeet",
  "employeeId", "duration", "numberOfPersons", "adultCount", "childCount",
  "accompanyingPerson", "vehicleAvailable", "vehicleNumber", "previousVisit",
  "frequentVisitor", "gate", "securityGuard", "mobileCount", "allowedAreas",
  "restrictedAreas", "otherItems", "bagChecked", "laptop", "camera", "visitorPhoto",
  "otp", "otpGeneratedAt", "otpVerified", "checkInTime", "checkOutTime", "status",
  "badgeNumber", "gatePassNumber", "gatePassIssuedAt",
  "exitGate", "badgeReturned", "exitRemarks",
];

// ---------------- CREATE (OTP verify ho jaane ke baad call hoti hai — status seedha IN) ----------------
const createVisitorEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    const sessionEmployeeId = req.employeeId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const {
      visitorId, fullName, gender, mobileNumber, email, company, address,
      country, state, city, pincode, idProofType, idProofNumber,
      visitDate, entryTime, exitTime, purpose, department, personToMeet,
      employeeId, duration, numberOfPersons, adultCount, childCount,
      accompanyingPerson, vehicleAvailable, vehicleNumber, previousVisit,
      frequentVisitor, gate, securityGuard, mobileCount, allowedAreas,
      restrictedAreas, otherItems, bagChecked, laptop, camera,
    } = req.body;

    const visitorPhotoPath = getFilePath(req.files, "visitorPhoto");
    if (!visitorPhotoPath) {
        return requiredmessage(res, "Visitor photo is required");
    }

    // ---- Entry Time hi Check-in Time banega (visitDate + entryTime combine karke) ----
    let checkInTime = new Date().toISOString();
    if (visitDate && entryTime) {
      const combined = new Date(`${visitDate}T${entryTime}:00`);
      if (!isNaN(combined.getTime())) {
        checkInTime = combined.toISOString();
      }
    }

    const payload = {
      companyId,
      visitorId: visitorId || ("VIS-" + Date.now().toString().slice(-8)),
      fullName, gender, mobileNumber,
      email: email || null,
      company: company || null,
      address: address || null,
      country: country || null,
      state: state || null,
      city: city || null,
      pincode: pincode || null,
      idProofType, idProofNumber,
      idFrontPhoto: getFilePath(req.files, "idFrontPhoto"),
      idBackPhoto: getFilePath(req.files, "idBackPhoto"),
      visitDate, entryTime,
      exitTime: exitTime || null,
      purpose,
      department: department || null,
      personToMeet,
      employeeId: employeeId || null,
      duration: duration || null,
      numberOfPersons: numberOfPersons || null,
      adultCount: adultCount || null,
      childCount: childCount || null,
      accompanyingPerson: accompanyingPerson || null,
      vehicleAvailable: vehicleAvailable === true || vehicleAvailable === "true",
      vehicleNumber: vehicleNumber || null,
      previousVisit: previousVisit === true || previousVisit === "true",
      frequentVisitor: frequentVisitor === true || frequentVisitor === "true",
      gate: gate || null,
      securityGuard: securityGuard || null,
      mobileCount: mobileCount || null,
      allowedAreas: allowedAreas || null,
      restrictedAreas: restrictedAreas || null,
      otherItems: otherItems || null,
      bagChecked: bagChecked === true || bagChecked === "true",
      laptop: laptop === true || laptop === "true",
      camera: camera === true || camera === "true",
      visitorPhoto: visitorPhotoPath,
      status: "IN",              // ✅ CHANGED — ab HOLD nahi, seedha IN
      otpVerified: true,         // ✅ CHANGED — wizard yaha OTP verify hone ke baad hi call karta hai
      checkInTime,                // ✅ CHANGED — Entry Time se banaya gaya check-in time
      createdBy: sessionEmployeeId,
      createdType: "Security",
      delete: 0,
    };

    const entry = await saveModel("visitorentry", payload);

    return successResponse(res, mapPhotoUrls(entry), "Visitor entry created successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- UPDATE (Edit ke liye — NEW) ----------------
const updateVisitorEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const existing = await selectWithJoins(
      "visitorentry", [], { visitorEntryId: id, companyId, delete: 0 }, ["visitorEntryId"]
    );
    if (existing.length === 0) {
      return requiredmessage(res, "Visitor entry not found");
    }

    const {
      fullName, gender, mobileNumber, email, company, address,
      country, state, city, pincode, idProofType, idProofNumber,
      visitDate, entryTime, exitTime, purpose, department, personToMeet,
      employeeId, duration, numberOfPersons, adultCount, childCount,
      accompanyingPerson, vehicleAvailable, vehicleNumber, previousVisit,
      frequentVisitor, gate, securityGuard, mobileCount, allowedAreas,
      restrictedAreas, otherItems, bagChecked, laptop, camera,
    } = req.body;

    const payload = {
      fullName, gender, mobileNumber,
      email: email || null,
      company: company || null,
      address: address || null,
      country: country || null,
      state: state || null,
      city: city || null,
      pincode: pincode || null,
      idProofType, idProofNumber,
      visitDate, entryTime,
      exitTime: exitTime || null,
      purpose,
      department: department || null,
      personToMeet,
      employeeId: employeeId || null,
      duration: duration || null,
      numberOfPersons: numberOfPersons || null,
      adultCount: adultCount || null,
      childCount: childCount || null,
      accompanyingPerson: accompanyingPerson || null,
      vehicleAvailable: vehicleAvailable === true || vehicleAvailable === "true",
      vehicleNumber: vehicleNumber || null,
      previousVisit: previousVisit === true || previousVisit === "true",
      frequentVisitor: frequentVisitor === true || frequentVisitor === "true",
      gate: gate || null,
      securityGuard: securityGuard || null,
      mobileCount: mobileCount || null,
      allowedAreas: allowedAreas || null,
      restrictedAreas: restrictedAreas || null,
      otherItems: otherItems || null,
      bagChecked: bagChecked === true || bagChecked === "true",
      laptop: laptop === true || laptop === "true",
      camera: camera === true || camera === "true",
      updated: new Date(),
    };

    // Photo sirf tabhi update hogi jab naya file aaya ho (multer ne req.files me daala ho)
    // Warna purani photo DB me as-is rahegi
    const idFront = getFilePath(req.files, "idFrontPhoto");
    if (idFront) payload.idFrontPhoto = idFront;

    const idBack = getFilePath(req.files, "idBackPhoto");
    if (idBack) payload.idBackPhoto = idBack;

    const visitorPhoto = getFilePath(req.files, "visitorPhoto");
    if (visitorPhoto) payload.visitorPhoto = visitorPhoto;

    await updateModelHelper("visitorentry", payload, { visitorEntryId: id, companyId });

    const updatedRows = await selectWithJoins(
      "visitorentry", [], { visitorEntryId: id, companyId }, SELECT_FIELDS
    );

    return successResponse(res, mapPhotoUrls(updatedRows[0]), "Visitor entry updated successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- LIST ----------------
const getVisitorEntryList = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const list = await selectWithJoins(
      "visitorentry", [], { companyId, delete: 0 }, SELECT_FIELDS,
      [["visitorEntryId", "DESC"]]
    );

    return successResponse(res, list.map(mapPhotoUrls), "Visitor entry list fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- GET BY ID ----------------
const getVisitorEntryById = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { id } = req.params;

    const rows = await selectWithJoins(
      "visitorentry", [], { visitorEntryId: id, companyId, delete: 0 }, SELECT_FIELDS
    );

    if (rows.length === 0) {
      return requiredmessage(res, "Visitor entry not found");
    }

    return successResponse(res, mapPhotoUrls(rows[0]), "Visitor entry fetched successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- EXIT ----------------
const exitVisitorEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { visitorEntryId, exitTime, exitGate, exitRemarks } = req.body;
    const badgeReturned = req.body.badgeReturned === true || req.body.badgeReturned === "true";

    const existing = await selectWithJoins(
      "visitorentry", [], { visitorEntryId, companyId, delete: 0 }, ["visitorEntryId", "status"]
    );
    if (existing.length === 0) {
      return requiredmessage(res, "Visitor entry not found");
    }
    if (existing[0].status === "OUT") {
      return errorResponse(res, "This visitor is already marked OUT.");
    }

    await updateModelHelper(
      "visitorentry",
      {
        status: "OUT",
        exitTime,
        checkOutTime: new Date().toISOString(),
        exitGate,
        badgeReturned,
        exitRemarks: exitRemarks || null,
        updated: new Date(),
      },
      { visitorEntryId, companyId }
    );

    return successResponse(res, {}, "Visitor exit marked successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

// ---------------- DELETE (soft delete) ----------------
const deleteVisitorEntry = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return requiredmessage(res, "Unauthorized. Please login again.");
    }

    const { visitorEntryId } = req.body;

    const existing = await selectWithJoins(
      "visitorentry", [], { visitorEntryId, companyId, delete: 0 }, ["visitorEntryId"]
    );
    if (existing.length === 0) {
      return requiredmessage(res, "Visitor entry not found");
    }

    await updateModelHelper(
      "visitorentry",
      { delete: 1, updated: new Date() },
      { visitorEntryId, companyId }
    );

    return successResponse(res, {}, "Visitor entry deleted successfully");
  } catch (error) {
    return errorResponse(res, "Something Went Wrong", error);
  }
};

module.exports = {
  createVisitorEntry,
  updateVisitorEntry,
  getVisitorEntryList,
  getVisitorEntryById,
  exitVisitorEntry,
  deleteVisitorEntry,
};