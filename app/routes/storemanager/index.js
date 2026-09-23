module.exports = (app) => {
  require("./stockreport.routes")(app);
  require("./itemmaster.routes")(app);
  require("./location.routes")(app);
  require("./itemcategory.routes")(app);
   require("./itemgroup.routes")(app);
    require("./purchaseorder.routes")(app);
     require("./purchase.routes")(app);
      require("./grr.routes")(app);
        require("./itemrequest.routes")(app); 
};