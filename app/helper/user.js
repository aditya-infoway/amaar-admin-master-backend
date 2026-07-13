

const db = require("../modelses/index.js");
const userModel = db.user
const Op = db.Sequelize.Op;



const checkUser = async (userId) => {
  var data = [await userModel.findOne({
    attributes: ["userId", "fullName", "firstName", "lastName",
    //  "dateOfBirth", "gender", 
     "email", "password", "mobileNumber", 
    //  "profilePicture",
       "otp",],
    where: {
      userId: userId,
      delete: 0,
    },
    raw:true
  })
  ] 
  return data ;

}



const checktoken = async (token) => {
  
  return data = await userModel.findAll({
    attributes: ["userId",  "token"],
    where: {
      token: token,
      delete: 0,
    },
    raw:true
  })
}
module.exports = {
  checkUser,
  checktoken
}