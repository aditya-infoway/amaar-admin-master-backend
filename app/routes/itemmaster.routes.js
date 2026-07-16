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

  routes.get("/generate-barcode", itemmaster.getNextBarcode); // 👈 :id se pehle

  routes.post(
    "/create",
    validate(itemmasterValidation.createItemMaster),
    itemmaster.createItemMaster
  );
  routes.get("/list", itemmaster.getItemMasterList);
  routes.get("/:id", itemmaster.getItemMasterById);
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

  routes.get("/generate-barcode", itemmaster.getNextBarcode);
  routes.put("/set-barcode", validate(itemmasterValidation.setItemBarcode), itemmaster.setItemBarcode);
  routes.post("/auto-generate", validate(itemmasterValidation.autoGenerateItemBarcode), itemmaster.autoGenerateItemBarcode);
  routes.post("/bulk-generate", validate(itemmasterValidation.bulkAutoGenerateBarcode), itemmaster.bulkAutoGenerateBarcode);

  app.use("/master/itemmaster", routes);
};