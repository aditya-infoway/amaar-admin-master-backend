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

require("./app/routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
