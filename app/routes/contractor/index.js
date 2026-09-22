module.exports = (app) => {
    require("./workorder.routes")(app); 
    require("./itemrequest.routes")(app); 
 
};