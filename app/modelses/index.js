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
db.company = require("./company.js")(sequelize, Sequelize);
db.companydetails = require("./companydetails.js")(sequelize, Sequelize);
db.financialyear = require("./financialyear.js")(sequelize, Sequelize);
db.category = require("./category.js")(sequelize, Sequelize);
db.productseries = require("./productseries.js")(sequelize, Sequelize);
db.model = require("./model.js")(sequelize, Sequelize);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;