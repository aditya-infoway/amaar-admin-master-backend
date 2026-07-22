const Sequelize = require('sequelize');
const process = require('process');
const config =require("../config/db-config.js");
const db = {};

let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, config);
}

db.admin = require("./admin.js")(sequelize, Sequelize);
db.group = require("./group.js")(sequelize, Sequelize);
db.company = require("./company.js")(sequelize, Sequelize);
db.companydetails = require("./companydetails.js")(sequelize, Sequelize);
db.financialyear = require("./financialyear.js")(sequelize, Sequelize);
db.category = require("./category.js")(sequelize, Sequelize);
db.productseries = require("./productseries.js")(sequelize, Sequelize);
db.model = require("./model.js")(sequelize, Sequelize);
db.variant = require("./variant.js")(sequelize, Sequelize);
db.variantstructure = require("./variantstructure.js")(sequelize, Sequelize);
db.enquirytype = require("./enquirytype.js")(sequelize, Sequelize);
db.enquirysource = require("./enquirysource.js")(sequelize, Sequelize);
db.profession = require("./profession.js")(sequelize, Sequelize);
db.enquirystatus = require("./enquirystatus.js")(sequelize, Sequelize);
db.bodytype = require("./bodytype.js")(sequelize, Sequelize);
db.axlebrand = require("./axlebrand.js")(sequelize, Sequelize);
db.hydraulicbrand = require("./hydraulicbrand.js")(sequelize, Sequelize);
db.tyrebrand = require("./tyrebrand.js")(sequelize, Sequelize);
db.account = require("./account.js")(sequelize, Sequelize);
db.accountopeningbalance = require("./accountopeningbalance.js")(sequelize, Sequelize);
db.itemcategory = require("./itemcategory.js")(sequelize, Sequelize);
db.itemgroup = require("./itemgroup.js")(sequelize, Sequelize);
db.itemmaster = require("./itemmaster.js")(sequelize, Sequelize);
db.purchase = require("./purchase.js")(sequelize, Sequelize);
db.purchasedetails = require("./purchasedetails.js")(sequelize, Sequelize);
db.role = require("./role.js")(sequelize, Sequelize);
db.employee = require("./employee.js")(sequelize, Sequelize);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;