const { errorResponse } = require("../../helper/index.js");
const modelPrice = require("../../controllers/superadmin/controller/modelpricecontroller.js");
const modelPriceValidation = require("../../controllers/superadmin/validator/modelpricevalidator.js");
const { superAdminAuth } = require("../../helper/superAdminAuth.js");

var routes = require("express").Router();

const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
        const message = error.details.map((i) => i.message).join(",");
        return errorResponse(res, message);
    }
    req.body = value;
    next();
};

module.exports = (app) => {
    routes.use(superAdminAuth);

    // ---------------------------------------------------------
    // DROPDOWN / HELPER ENDPOINTS  (must be before /:id)
    // ---------------------------------------------------------

    // Finished Goods that already have a complete BOM
    routes.get("/finished-goods", modelPrice.getFinishedGoodsOptions);

    // Select Item → Create Master list (same for all types)
    routes.get("/items", modelPrice.getCreateMasterOptions);

    // Group + SubGroup list (used only when Type = BOM)
    routes.get("/groups", modelPrice.getGroupOptions);

    // Auto-fetch weight / rate according to Type
    // Query: ?type=BOM|Manual|Quotation&createMasterId=xx&finishedGoodsItemId=yy
    routes.get("/auto-fetch", modelPrice.getAutoFetchValues);

    // ---------------------------------------------------------
    // CRUD
    // ---------------------------------------------------------

    routes.get("/list", modelPrice.getModelPriceList);

    routes.get("/:id", modelPrice.getModelPriceById);

    routes.post(
        "/create",
        validate(modelPriceValidation.createModelPrice),
        modelPrice.createModelPrice,
    );

    routes.put(
        "/update",
        validate(modelPriceValidation.updateModelPrice),
        modelPrice.updateModelPrice,
    );

    routes.delete(
        "/delete",
        validate(modelPriceValidation.deleteModelPrice),
        modelPrice.deleteModelPrice,
    );

    // Base path – match the URL you already use in the browser
    app.use("/master/quotation-master/modelprice", routes);
    // also keep a shorter alias if you prefer
    // app.use("/master/modelprice", routes);
};
