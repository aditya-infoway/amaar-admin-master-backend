const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Development ke liye sab origins allow
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var cron = require("node-cron");

const bodyParser = require('body-parser');
// app.use(express.json());
app.use(bodyParser.json());

const db = require("./app/modelses/index.js");

// set alter :true when sync model with database   
db.sequelize.sync({alter: false})
  .then(() => {
    console.log("Synced db.");
  })
  .catch((err) => {
    console.log("Failed to sync db: " + err.message);
    console.log(err.message);
    console.log(err.parent?.message);
    console.log(err.sql);
  });


app.use("/Uploadimages", express.static(path.join(__dirname, "Uploadimages")));

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Amaar Software." });
});

require("./app/routes/master.routes.js")(app);
require("./app/routes/company.routes.js")(app);
require("./app/routes/superadmin.routes.js")(app);
require("./app/routes/category.routes.js")(app);
require("./app/routes/productseries.routes.js")(app);
require("./app/routes/model.routes.js")(app);
require("./app/routes/variant.routes.js")(app);
require("./app/routes/variantstructure.routes.js")(app);
require("./app/routes/enquirytype.routes.js")(app);
require("./app/routes/enquirysource.routes.js")(app);
require("./app/routes/profession.routes.js")(app);
require("./app/routes/enquirystatus.routes.js")(app);
require("./app/routes/bodytype.routes.js")(app);
require("./app/routes/axlebrand.routes.js")(app);
require("./app/routes/hydraulicbrand.routes.js")(app);
require("./app/routes/tyrebrand.routes.js")(app);
require("./app/routes/group.routes.js")(app);
require("./app/routes/account.routes.js")(app);
require("./app/routes/itemcategory.routes.js")(app);
require("./app/routes/itemgroup.routes.js")(app);
require("./app/routes/itemmaster.routes.js")(app);

// set port, listen for requests
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
