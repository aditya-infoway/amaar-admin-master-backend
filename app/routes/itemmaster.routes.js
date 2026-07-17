const { errorResponse } = require("../helper/index.js");
const itemmaster = require("../controllers/superadmin/controller/itemmastercontroller.js");
const itemmasterValidation = require("../controllers/superadmin/validator/itemmastervalidator.js");
const { superAdminAuth } = require("../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map((i) => i.message).join(",");
    console.log("error", message);
    return errorResponse(res, message);
  }
  next();
};

module.exports = (app) => {
  routes.use(superAdminAuth);

  // ───── Static / named GET routes — hamesha "/:id" se PEHLE ─────
  routes.get("/list", itemmaster.getItemMasterList);
  routes.get("/vehicle-list", itemmaster.getVehicleItemList);
  routes.get("/generate-barcode", itemmaster.getNextBarcode);
  routes.get("/barcode/:barcode", itemmaster.getItemByBarcode);

  // ───── POST / PUT / DELETE routes (method alag hai, order matter nahi karta) ─────
  routes.post(
    "/create",
    validate(itemmasterValidation.createItemMaster),
    itemmaster.createItemMaster
  );
  routes.put(
    "/update",
    validate(itemmasterValidation.updateItemMaster),
    itemmaster.updateItemMaster
  );
  routes.delete(
    "/delete",
    validate(itemmasterValidation.deleteItemMaster),
    itemmaster.deleteItemMaster
  );
  routes.put(
    "/set-barcode",
    validate(itemmasterValidation.setItemBarcode),
    itemmaster.setItemBarcode
  );
  routes.post(
    "/auto-generate",
    validate(itemmasterValidation.autoGenerateItemBarcode),
    itemmaster.autoGenerateItemBarcode
  );
  routes.post(
    "/bulk-generate",
    validate(itemmasterValidation.bulkAutoGenerateBarcode),
    itemmaster.bulkAutoGenerateBarcode
  );

  // ───── Generic dynamic GET route — hamesha SABSE AAKHIR me ─────
  routes.get("/:id", itemmaster.getItemMasterById);

  app.use("/master/itemmaster", routes);
};