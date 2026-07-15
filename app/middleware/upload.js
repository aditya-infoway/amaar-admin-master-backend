const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Reusable factory — har jagah alag subfolder ke liye ye function call karo
// Example: createUploader("company_logo"), createUploader("product_images"), createUploader("user_profile")
const createUploader = (subfolder) => {
  const uploadPath = path.join("./Uploadimages", subfolder);

  // folder na ho to khud bana do
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const uniqueName = subfolder + "_" + Date.now() + ext;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed"));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });
};

module.exports = { createUploader };