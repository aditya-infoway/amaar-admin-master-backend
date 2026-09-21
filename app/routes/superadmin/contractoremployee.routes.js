const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { errorResponse } = require("../../helper/index.js");
const contractorEmployee = require("../../controllers/superadmin/controller/contractoremployeecontroller.js");
const contractorEmployeeValidation = require("../../controllers/superadmin/validator/contractoremployeevalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

// ---------------- IMAGE UPLOAD ----------------
// Saved under <project root>/Uploadimages/contractor_employee and served at
// /Uploadimages/contractor_employee/<file> (same as sales_order).
const uploadDir = path.join(
  __dirname,
  "../../Uploadimages/contractor_employee",
);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(
      null,
      `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`,
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per image
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

const uploadFields = (req, res, next) => {
  upload.fields([
    { name: "aadharImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return errorResponse(res, err.message || "File upload failed.");
    next();
  });
};

// If validation fails, don't leave the just-uploaded images on disk
const removeUploadedFiles = (req) => {
  Object.values(req.files || {})
    .flat()
    .forEach((file) => fs.unlink(file.path, () => {}));
};

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    removeUploadedFiles(req);
    const message = error.details.map((i) => i.message).join(",");
    return errorResponse(res, message);
  }
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  routes.post(
    "/create",
    uploadFields,
    validate(contractorEmployeeValidation.createContractorEmployee),
    contractorEmployee.createContractorEmployee,
  );
  routes.get("/list", contractorEmployee.getContractorEmployeeList);
  routes.get("/party/list", contractorEmployee.getPartyList);
  routes.get("/:id", contractorEmployee.getContractorEmployeeById);
  routes.put(
    "/:id",
    uploadFields,
    validate(contractorEmployeeValidation.updateContractorEmployee),
    contractorEmployee.updateContractorEmployee,
  );
  routes.delete("/:id", contractorEmployee.deleteContractorEmployee);

  app.use("/contractoremployee", routes);
};
