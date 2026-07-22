const crypto = require("crypto");
const db = require("../modelses/index.js");
// const sharp = require('sharp');
const helper = require("./user.js");
const adminHelper = require("./admin.js");
const { log } = require("console");
const nodemailer=require("nodemailer")
const Op = db.Sequelize.Op;
const moment = require('moment');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

var sequelize = db.sequelize



// success message
const successResponse = (res, data=[],  message="success",) => 
{

  code = 200
  res.send({
    status:code,
    message,
    data,
    success: true,
  });
}



//clean string
function cleanString(str){
  return (str ||"")
}

// Clean Object
 const cleanObject = (myObject) => {
   Object.keys(myObject).map(function (key, index) {
     if (myObject[key] == null) {
       index;
       myObject[key] = "";
     } else {
      // console.log(myObject);
       myObject[key] = mysql_real_escape_string(myObject[key]);
     }
   });
   return myObject;
 };

 function mysql_unreal_escape_string(string) {
  // return string
  return cleanString(string)

}

// Return image with url
const getBlobTempPublicUrl = (blobName) => {
  return blobName == "" || blobName == undefined || blobName == null
    ? ""
    : "http://localhost:8001/Uploadimages/" + blobName;
}
const categoryURL = (blobName) => {
  return (blobName == "" || blobName == undefined || blobName == null) ? "" : getBlobTempPublicUrl("icons/" + blobName)
}
const videoUrl = (blobName) => {
  return (blobName == "" || blobName == undefined || blobName == null) ? "" : getBlobTempPublicUrl("videos/" + blobName)
}

// ===== YE NAYA FUNCTION ADD KIYA — DB ka relative path le ke full URL banata hai =====
const toFullUrl = (relativePath) => {
  if (!relativePath) return null;
  // agar path me already "Uploadimages/" laga hua hai (jaisa getFilePath deta hai),
  // to usko hata do taaki URL me "Uploadimages" do baar na aaye
  const cleanPath = relativePath.replace(/^Uploadimages[\\/]/, "");
  return "http://localhost:8001/Uploadimages/" + cleanPath;
};

//catch error message
const errorResponse = (
  res,
  errorMessage = 'Something went wrong',
  error = {},
) => {



  message =mysql_unreal_escape_string(errorMessage)

  code = 400
  res.send({
    status:code,
    message ,
    error,

    success: false,
  });
  console.log(error)
}

// generate unique code 
const generateCode = (userId, string) => {
  var code = "";

  strlen = ((userId).toString()).length // find length
  for (var i = 0; i < (7 - (strlen)); i++) {
      code += "0";
  }


  // console.log("LM"+code+(userId));
  return string + code + (userId)

}


// unique id
const uniqueId = async () => {
  var id = crypto.randomBytes(30).toString("hex");
   var check  =await adminHelper.checktoken(id);
  while (check.length !=0) {
    id =await uniqueId()
  }

  return id;

}

//check input blank or not
const validateData = (data2) => {

  const data = cleanString(data2)
  if (data == null || data == undefined || data == "") {
      return true
  } else {
      return false
  }
}

// uc first string
const ucFirst =(string)=>{
  return string.charAt(0).toUpperCase() + string.slice(1);
}

//save resized image
const saveResizedImage = (path, filename) => {
    sharp(path).resize(100, 100, {
        fit: sharp.fit.inside,
        withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
    }).toFormat("jpeg").toFile(`./media/images/resized_${filename}`);

    return `resized_${filename}`;
}


//update model

const updateModel = async (model, query = {}, condition) => {

  const joinedModel = db[model]
  var data = await joinedModel.update(query, {where:condition});
  
  return data
}


// insert model
const saveModel = async(tableName,payload) =>{
  const model = db[tableName];
// console.log(payload);
  var data = await  model.create(payload);
  // console.log(data);
  return data.dataValues
}

// select data from model 
const selectWithJoins = async(tableName, joinTables = [], whereClause = {}, attributes = [], order = [], limit = null)=> {
  const model = db[tableName]


  const options = {
    where: whereClause,
    attributes: attributes.length ? attributes : undefined,
    order: order.length ? order : undefined,
    raw:true
  }

  if(limit != null && limit != undefined ){
    options["limit"]=limit
  }


  // Build the join query
  joinTables.forEach(({ table, alias, onClause }) => {

    // console.log(onClause);
    const joinedModel = db[table]
    options.include = options.include || []
    options.include.push({
      model: joinedModel,
      as: alias,
      required: true,
      on: onClause
    })
  })
  // console.log(options);
  return await model.findAll(options)
}

//check email
const checkemail=async(email,userId)=>{
  if(email=="" || email==null ||email==undefined)
  {
    return 0
  }
  else
  {
    var tableName="user";
    var whereClause={email:email,delete: 0}
    var joinTables=[]
    var limit=null
    var attributes= ["userId" ]
    var order=[]
    if(userId>0)
    {
      var whereClause={userId: { [Op.ne]: userId },email:email,delete: 0}
    }
    var res=await selectWithJoins(tableName, joinTables, whereClause, attributes, order, limit)
    if(res.length>0)
    {
      return res[0]['userId']
    }
    else
    {
      return 0
    }
    
  }
  
}

// check mobileNumber
const checkmobile=async(mobileNumber,userId)=>{
  if(mobileNumber=="" || mobileNumber==null ||mobileNumber==undefined)
  {
    return 0
  }
  else
  {
    var tableName="user";
    var whereClause={mobileNumber:mobileNumber,delete: 0}
    var joinTables=[]
    var limit=null
    var attributes= ["userId" ]
    var order=[]
    if(userId>0)
    {
      var whereClause={userId: { [Op.ne]: userId },mobileNumber:mobileNumber,delete: 0}
    }
    var res=await selectWithJoins(tableName, joinTables, whereClause, attributes, order, limit)
    // console.log(await selectWithJoins(tableName, joinTables, whereClause, attributes, order, limit));
    if(res.length>0)
    {
      return res[0]['userId'];
    }
    else
    {
      return 0
    }
    
  }
}

//check email
const checkvendoremail=async(email,vendorId)=>{
  if(email=="" || email==null ||email==undefined)
  {
    return 0
  }
  else
  {
    var tableName="vendor";
    var whereClause={email:email,delete: 0}
    var joinTables=[]
    var limit=null
    var attributes= ["vendorId" ]
    var order=[]
    if(vendorId>0)
    {
      var whereClause={vendorId: { [Op.ne]: vendorId },email:email,delete: 0}
    }
    var res=await selectWithJoins(tableName, joinTables, whereClause, attributes, order, limit)
    if(res.length>0)
    {
      return res[0]['vendorId']
    }
    else
    {
      return 0
    }
    
  }
  
}

// check mobileNumber
const checkvendormobile=async(mobileNumber,vendorId)=>{
  if(mobileNumber=="" || mobileNumber==null ||mobileNumber==undefined)
  {
    return 0
  }
  else
  {
    var tableName="vendor";
    var whereClause={mobileNumber:mobileNumber,delete: 0}
    var joinTables=[]
    var limit=null
    var attributes= ["vendorId" ]
    var order=[]
    if(vendorId>0)
    {
      var whereClause={vendorId: { [Op.ne]: vendorId },mobileNumber:mobileNumber,delete: 0}
    }
    var res=await selectWithJoins(tableName, joinTables, whereClause, attributes, order, limit)
    // console.log(await selectWithJoins(tableName, joinTables, whereClause, attributes, order, limit));
    if(res.length>0)
    {
      return res[0]['vendorId'];
    }
    else
    {
      return 0
    }
    
  }
}



// /generate otp 
function generateOTP() {
  const digits = '0123456789';
  let OTP = '';
  
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  
  return OTP;
}

// error message
const requiredmessage=(res,message)=>{
  res.send({
    "status":400,
    "message":message
  })
}

// // left join function
// const selectWithJoinsV2 = async (tableName, joinClauses, whereClauses, selectColumns, orderBy, limit) => {
//   // Build the JOIN clauses
//   const joinString = joinClauses.map(joinClause => {
//     const { table, alias, onClause } = joinClause;
//     const onString = Object.entries(onClause).map(([leftKey, rightValue]) => {
//       const rightKey = Object.keys(rightValue)[0];
//       const column = rightValue[rightKey];
//       return `${leftKey} = ${column}`;
//     }).join(' AND ');
//     return `LEFT JOIN ${table} AS ${alias} ON ${onString}`;
//   }).join(' ');

//   // Build the WHERE clause
//   const whereString = whereClauses ? `WHERE ${Object.entries(whereClauses).map(([key, value]) => {
//     if (typeof value === 'object' && value !== null) {
//       const operator = Object.keys(value)[0];
//       const columnValue = value[operator];
//       return `${key} ${operator} '${columnValue}'`;
//     } else {
//       return `${key} = '${value}'`;
//     }
//   }).join(' AND ')}` : '';

//   // Build the SELECT columns
//   const selectString = selectColumns.join(', ');

//   // Build the ORDER BY clause
//   const orderByString = orderBy.length != 0 ? `ORDER BY ${orderBy.map(column => `${column[0]} ${column[1]}`).join(', ')}` : '';

//   // Build the LIMIT clause
//   const limitString = limit ? `LIMIT ${limit}` : '';

//   // Combine all the parts of the query into a single string
//   const query = `SELECT ${selectString} FROM ${tableName} ${joinString} ${whereString} ${orderByString} ${limitString}`;

//   return await getResult(query);



//   // example


//   //   const tableName = 'users';
//   // const joinClauses = [
//   //   { table: 'orders', alias: 'o', onClause: { '$o.userId$': { '$users.id$': Sequelize.col('id') } } },
//   //   { table: 'products', alias: 'p', onClause: { '$o.productId$': { '$p.id$': Sequelize.col('id') } } }
//   // ];
//   // const whereClause = { '$p.name$': { [Sequelize.Op.like]: '%Shoes%' } };
//   // const selectColumns = ['id', 'name', 'p.name'];
//   // const orderBy = [['name', 'ASC']];
//   // const limit = 10;
// }


// left join function
const selectWithJoinsV2 = async (tableName, joinClauses, whereClauses, selectColumns, orderBy, limit,offset) => {
  // Build the JOIN clauses
  const joinString = joinClauses.map(joinClause => {
    const { table, alias, onClause } = joinClause;
    const onString = Object.entries(onClause).map(([leftKey, rightValue]) => {
      const rightKey = Object.keys(rightValue)[0];
      const column = rightValue[rightKey];
      return `${leftKey} = ${column}`;
    }).join(' AND ');
    return `LEFT JOIN ${table} AS ${alias} ON ${onString}`;
  }).join(' ');

  // Build the WHERE clause
  const whereString = whereClauses ? `WHERE ${Object.entries(whereClauses).map(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const operator = Object.keys(value)[0];
      const columnValue = value[operator];
      // return `${key} ${operator} '${columnValue}'`;

      if (typeof value === "object" && value !== null) {
        const operator = Object.keys(value)[0];
        const columnValue = value[operator];

        if (operator.toUpperCase() === "IN") {
            return `${key} IN ${columnValue}`;
        }

        return `${key} ${operator} '${columnValue}'`;
    }
    } else {
      return `${key} = '${value}'`;
    }
  }).join(' AND ')}` : '';

  // Build the SELECT columns
  const selectString = selectColumns.join(', ');

  // Build the ORDER BY clause
  const orderByString = orderBy.length != 0 ? `ORDER BY ${orderBy.map(column => `${column[0]} ${column[1]}`).join(', ')}` : '';

  // Build the LIMIT clause
  const limitString = limit>0 ? offset>0 ? `LIMIT ${offset+','+limit}`:`LIMIT ${limit}` : '';


  // Combine all the parts of the query into a single string
  const query = `SELECT ${selectString} FROM ${tableName} ${joinString} ${whereString} ${orderByString} ${limitString}`;
// console.log(await getResult(query))
  return await getResult(query);



}

const getResult = async (query) => {
  return await db.sequelize.query(query, {
    type: db.sequelize.QueryTypes.SELECT
  })
}


// cart item toal
const cartitemstotal=async(userId)=>{

  var data=[];
  var total=0;
  var discount=0;
  var subtotal=0;
  tableName="cart"
        var whereClause={"sto.delete" :0,"cart.userId":userId}
        var joinTables=[
            {table:'stock',alias:"sto",onClause: { 'sto.stockId': { '=': 'cart.productvariantId' } } },
            {table:'product',alias:"p",onClause: { 'p.productId': { '=': 'sto.productId' } } }
        ]
        var attributes= ["cart.cartId","sto.stockId","sto.productId","p.name","sto.price","sto.quantity AS stocks","cart.quantity","sto.combination","(SELECT `image` FROM `image` WHERE `productId`=`sto`.`productId` ORDER BY `imageId` LIMIT 1)AS `image`"]
        var order=[
            ["cart.cartId","DESC"]
        ]
        
        var getproduct=await selectWithJoinsV2(tableName,joinTables,whereClause,attributes,order,null,0);

        for(var i=0;i<getproduct.length;i++)
        {
            var stockmessage=""
            var combo=[]
            var combination=JSON.parse(getproduct[i]['combination']);
           
            // Convert JSON object to array with key-value pairs
            var combinationarray = Object.entries(combination);

            for(var j=0;j<combinationarray.length;j++)
            {
                // console.log(combinationarray[j]);
                var varinatName=await selectWithJoins("variant",[],{variantId:combinationarray[j][0]},['name'],[],null,0);
                if(varinatName.length>0)
                {
                    var arr={
                        name:varinatName[0]['name'],
                        value:combinationarray[j][1]
                    }
                    // console.log(arr);
                    
                    combo.push(arr)
                }
                
            }
            subtotal=subtotal+(getproduct[i]['price']*getproduct[i]['quantity']);
            if(getproduct[i]['stocks']==0)
            {
                stockmessage="Product Is Out Of Stock"
            }
            else if(getproduct[i]['stocks']<getproduct[i]['quantity'])
            {
                stockmessage="Available Stock Is "+getproduct[i]['stocks']
            }

            var arr={
                cartId:getproduct[i]['cartId'],
                productId:getproduct[i]['productId'],
                productvariantId:getproduct[i]['stockId'],
                name:getproduct[i]['name'],
                price:"$ "+getproduct[i]['price'],
                quantity:getproduct[i]['quantity'],
                image:getBlobTempPublicUrl(getproduct[i]['image']),
                stockmessage:stockmessage,
                combination:combo
            }
            data.push(arr);
        }
        total=subtotal

        // successResponse(res, [{subtotal:"$ "+subtotal,discount:"$ "+discount,total:"$ "+total,cartItems:data}],"success");


        
  return data=[{subtotal:"$ "+subtotal,discount:"$ "+discount,total:"$ "+total,cartItems:data}]
  
}


// check coupon 
const checkcouponfororder=async(couponId,alloverprice)=>{
  var today=moment().format('YYYY-MM-DD');
  var cpndata=[];

  // (tableName, joinTables = [], whereClause = {}, attributes = [], order = [], limit = null)?
  var chkcoupon=await getResult("SELECT `couponId`,`type`,`discount`,`maxDiscount` FROM `coupon` WHERE `couponId`='"+couponId+"' AND `startDate`<='"+today+"' AND `endDate`>='"+today+"' AND `minOrderAmount`<='"+alloverprice+"'")
  if(chkcoupon.length>0)
  {
      
      
      if(chkcoupon[0]['type']=="FLAT")
      {
          var totalAmount=alloverprice-chkcoupon[0]['discount'];
          cpndata.push(chkcoupon[0]['couponId'],chkcoupon[0]['type'],totalAmount,chkcoupon[0]['discount'])
          
          return cpndata;
      }
      else
      {
          var dis=((alloverprice)/100)*(chkcoupon[0]['discount']);
          
          if(dis>chkcoupon[0]['maxDiscount'])
          {
              var disco=chkcoupon[0]['maxDiscount'];
          }
          else
          {
              var disco=parseInt(dis);
          }
          var totalAmount=alloverprice-parseInt(disco);
          cpndata.push(chkcoupon[0]['couponId'],chkcoupon[0]['type'],totalAmount,parseInt(disco))
       
          return cpndata;
      }
      
      
  }
  else
  {
      
     cpndata.push(0,"None",alloverprice,0);
     return cpndata
  }
}

const checkcouponfororderwithvendorold=async(couponId,alloverprice,userId)=>{
  var today=moment().format('YYYY-MM-DD');
  var cpndata=[];

  // check coupon exist or not
  var chkcoupon=await getResult("SELECT `couponId`,`type`,`discount`,`maxDiscount`,`vendorId` FROM `coupon` WHERE `couponId`='"+couponId+"' AND `startDate`<='"+today+"' AND `endDate`>='"+today+"' AND `minOrderAmount`<='"+alloverprice+"'")
  
  
  // if coupon exist
  if(chkcoupon.length>0)
  {
    
    var newprice=0;
      // IF coupon is add by vendor than
      if(chkcoupon[0]['vendorId']>0)
      {
        // select vendor's product price
        var getvenpro=await getResult("SELECT `cart`.`quantity`,`stock`.`price` FROM `cart` LEFT JOIN `stock` ON `cart`.`productvariantId`=`stock`.`stockId` LEFT JOIN `product` ON `product`.`productId`=`stock`.`productId` WHERE `cart`.`userId`='"+userId+"' AND `product`.`vendorId`='"+chkcoupon[0]['vendorId']+"'");

        // if vendor product is exist in cart
        if(getvenpro.length>0)
        {
          for(var i=0;i<getvenpro.length;i++)
          {
            // console.log(getvenpro[i]['price']);
            // console.log(parseFloat(getvenpro[i]['price'])*parseFloat(getvenpro[i]['quantity']));
            newprice=newprice+parseFloat(getvenpro[i]['price'])*parseFloat(getvenpro[i]['quantity'])
          }
        }
        // if vendor's product is not exist
        else
        {
          cpndata.push(0,"None",alloverprice,0);
          return cpndata
        }
        

      }
      // if coupon is added by admin
      else
      {
       
        newprice=alloverprice
      }

      // console.log(newprice);
      // console.log(alloverprice)

      // if coupon type is flat
      if(chkcoupon[0]['type']=="FLAT")
      {
          var totalAmount=alloverprice-newprice+(newprice-chkcoupon[0]['discount']);
          cpndata.push(chkcoupon[0]['couponId'],chkcoupon[0]['type'],totalAmount,chkcoupon[0]['discount'])
          
          return cpndata;
      }
       // if coupon type is percantage
      else
      {
          var dis=((newprice)/100)*(chkcoupon[0]['discount']);
          
          if(dis>chkcoupon[0]['maxDiscount'])
          {
              var disco=chkcoupon[0]['maxDiscount'];
          }
          else
          {
              var disco=parseFloat(dis);
          }
          var totalAmount=alloverprice-newprice+(newprice-chkcoupon[0]['discount']);
          // var totalAmount=newprice-parseInt(disco);
          cpndata.push(chkcoupon[0]['couponId'],chkcoupon[0]['type'],totalAmount,parseInt(disco))
       
          return cpndata;
      }
      
      
  }
  // if coupon not exist
  else
  {
      
     cpndata.push(0,"None",alloverprice,0);
     return cpndata
  }
}

const checkcouponfororderwithvendor=async(couponId,alloverprice,userId)=>{
  var today=moment().format('YYYY-MM-DD');
  var cpndata=[];

  // check coupon exist or not
  var chkcoupon=await getResult("SELECT `couponId`,`type`,`discount`,`minOrderAmount`,`maxDiscount`,`vendorId` FROM `coupon` WHERE `couponId`='"+couponId+"' AND `startDate`<='"+today+"' AND `endDate`>='"+today+"' ")
  
  
  // if coupon exist
  if(chkcoupon.length>0)
  {
    
    var newprice=0;
      // IF coupon is add by vendor than
      if(chkcoupon[0]['vendorId']>0)
      {
        // select vendor's product price
        var getvenpro=await getResult("SELECT `cart`.`quantity`,`stock`.`price` FROM `cart` LEFT JOIN `stock` ON `cart`.`productvariantId`=`stock`.`stockId` LEFT JOIN `product` ON `product`.`productId`=`stock`.`productId` WHERE `cart`.`userId`='"+userId+"' AND `product`.`vendorId`='"+chkcoupon[0]['vendorId']+"'");

        // if vendor product is exist in cart
        if(getvenpro.length>0)
        {
          for(var i=0;i<getvenpro.length;i++)
          {
            // console.log(getvenpro[i]['price']);
            // console.log(parseFloat(getvenpro[i]['price'])*parseFloat(getvenpro[i]['quantity']));
            newprice=newprice+parseFloat(getvenpro[i]['price'])*parseFloat(getvenpro[i]['quantity'])
          }
        }
        // if vendor's product is not exist
        else
        {
          cpndata.push(0,"None",alloverprice,0);
          return cpndata
        }
        

      }
      // if coupon is added by admin
      else
      {
        newprice=alloverprice
      }

      // console.log(newprice);
      // console.log(alloverprice)

      if(newprice<chkcoupon[0]['minOrderAmount'])
      {
        cpndata.push(0,"None",alloverprice,0);
        return cpndata
      }
      else
      {
        // if coupon type is flat
        if(chkcoupon[0]['type']=="FLAT")
        {
            var totalAmount=alloverprice-newprice+(newprice-chkcoupon[0]['discount']);
            cpndata.push(chkcoupon[0]['couponId'],chkcoupon[0]['type'],totalAmount,chkcoupon[0]['discount'])
            
            return cpndata;
        }
        // if coupon type is percantage
        else
        {
            var dis=((newprice)/100)*(chkcoupon[0]['discount']);
            
            if(dis>chkcoupon[0]['maxDiscount'])
            {
                var disco=chkcoupon[0]['maxDiscount'];
            }
            else
            {
                var disco=parseFloat(dis);
            }
            var totalAmount=alloverprice-newprice+(newprice-chkcoupon[0]['discount']);
            // var totalAmount=newprice-parseInt(disco);
            cpndata.push(chkcoupon[0]['couponId'],chkcoupon[0]['type'],totalAmount,parseInt(disco))
        
            return cpndata;
        }

      }

      
      
      
  }
  // if coupon not exist
  else
  {
      
     cpndata.push(0,"None",alloverprice,0);
     return cpndata
  }
}

const validPassword = (password) => {
  // Password must be at least 8 characters long and contain at least one alphabet, one number, and one special character
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
  return passwordRegex.test(password);
};

const validemail = (email) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?:\.[A-Z]{2,})?$/i;
  return emailRegex.test(email);
};

const validPhoneNnumber = (phoneNumber) => {
  const phoneNumberRegex = /^[1-9]{1}[0-9]{5,15}$/i;
  return phoneNumberRegex.test(phoneNumber);
};


const checkEmail = async (table,email,atr,obj) => {
  
  if(email == "" || email==null ||email==undefined) {
    return 0
  } else {
    var keyy = Object.keys(obj);
    var str = `${keyy}`;
    var objVal = obj[keyy];

    var tableName = table;
    var whereClause={email:email,delete: 0}
    var joinTables=[]
    var limit=null
    var attributes = (atr == '' ? [] : atr);
    var order=[]
    if(objVal>0)
    {
      var whereClause = { email: email, delete: 0 };
      whereClause[str] = { [Op.ne]: objVal };
    }
    var res=await selectWithJoins(tableName, joinTables, whereClause, attributes, order, limit)
    if(res.length>0)
    {
      return res[0][atr[0]]
    }
    else
    {
      return 0
    }
    
  }

}


const deleteRecord = async (model, recordId) => {
  try {
    const joinedModel = db[model];
    const record = await joinedModel.findByPk(recordId);

    if (record) {
      await record.destroy();
      return 200;
    } else {
      return 404;
    }
  } catch (error) {
    return 500;
  }
};

const generateBookingCode = async () => {
  var code = "VB"
      var bookc = await selectWithJoins("booking",[],{delete:0},["bookingId"],orderby = [["bookingId", "DESC"]],)

      if (bookc.length > 0) {
        var strlen = (bookc[0]["bookingId"] + 1).toString();

        for (let i = 5; i > strlen.length; i--) {
          code += "0";
        }
        return code += (bookc[0]["bookingId"] + 1).toString();
      } else {
       return code += "00001";
      }
};

const timeSince = (date) => {
	var a = moment();
	var b = moment(date,);
	a.diff(b, "seconds") // 1
	var seconds = a.diff(b, "seconds");
	var interval = seconds / 31536000;
	if (interval > 1) {
		return Math.floor(interval) + " years ago";
	}
	interval = seconds / 2592000;
	if (interval > 1) {
		return Math.floor(interval) + " months ago";
	}
	interval = seconds / 86400;
	if (interval > 1) {
		return Math.floor(interval) + " days ago";
	}
	interval = seconds / 3600;
	if (interval > 1) {
		return Math.floor(interval) + " hours ago";
	}
	interval = seconds / 60;
	if (interval > 1) {
		return Math.floor(interval) + " minutes ago";
	}
	return Math.floor(seconds) + " seconds ago";
}


// Country List 
const countryDetails = async (countryId,field=[]) => {

  var where = {delete:0}
  if(countryId || countryId == 0){
    where.countryId=countryId
  }
	var data = await selectWithJoins("country",[],where,field);
	
	return data;
}

async function downloadImage(url,type = "Vehcile") {
  try {
     
      const ext = path.extname(new URL(url).pathname);
      var fileName = "vehicleProfile" + Date.now()+ext;

      if(type != "Vehcile"){
        fileName = "vendor" + Date.now()+ext;
      }

      const filePath = path.join('./Uploadimages/',fileName);

      const response = await axios({
          url: url,
          method: 'GET',
          responseType: 'stream', 
      });
 
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
          writer.on('finish', () => resolve(`${fileName}`));
          writer.on('error', reject);
      });
  } catch (error) {
      console.error('Error downloading the image:', error.message);
  }
}

// ============= Access Token Generate =========== 

const getFCMToken = async (type="USER",id)=>{
   
  var fcm = await selectWithJoins("fcmtoken",[],{delete:0,recordId:id,recordType:type},['token'],(orderby = [["fcmtokenId", "DESC"]]),1)

  if(fcm.length != 0){
    return fcm[0]['token']
  }else{
    return ""
  }
}

// add Notification
const saveNotification = async ( type, id, title, message)=>{
 
  var query = {
    type :type,
    id :id,
    title :title,
    message :message,
  }

  await saveModel("notification",query) 
  
}

const selectWithJoinsOrV2 = async (tableName, joinClauses, whereClauses, selectColumns, orderBy = [], limit, offset) => {
	// Build the JOIN clauses
	const joinString = joinClauses.map(joinClause => {
		const { table, alias, onClause } = joinClause;
		const onString = Object.entries(onClause).map(([leftKey, rightValue]) => {
			const rightKey = Object.keys(rightValue)[0];
			const column = rightValue[rightKey];
			return `${leftKey} = ${column}`;
		}).join(' AND ');
		return `LEFT JOIN ${table} AS ${alias} ON ${onString}`;
	}).join(' ');

	// Build the WHERE clause
	const whereString = whereClauses ? `WHERE ${Object.entries(whereClauses).map(([key, value]) => {
		if (key == "or") {
			return `(${Object.entries(value).map(([inkey, invalue]) => {

				inkey = Object.keys(invalue)[0]
				invalue = invalue[inkey]
				if (typeof invalue === 'object' && invalue !== null) {
					const operator = Object.keys(invalue)[0];
					// 			console.log(operator);
					const columnValue = invalue[operator];
					return `${inkey} ${operator} '${columnValue}'`;
				} else {
					return `${inkey} = '${invalue}'`;
				}
			}).join(' OR ')})`;
		}
		if (typeof value === 'object' && value !== null) {
			const operator = Object.keys(value)[0];
			const columnValue = value[operator];
			return `${key} ${operator} '${columnValue}'`;
		} else {
			return `${key} = '${value}'`;
		}
	}).join(' AND ')}` : '';

	// Build the SELECT columns
	const selectString = selectColumns.join(', ');

	// Build the ORDER BY clause
	const orderByString = orderBy.length != 0 ? `ORDER BY ${orderBy.map(column => `${column[0]} ${column[1]}`).join(', ')}` : '';

	// Build the LIMIT clause
	const limitString = limit > 0 ? (offset > 0 ? `OFFSET ${offset} LIMIT ${limit}` : `LIMIT ${limit}`) : '';



	// Combine all the parts of the query into a single string
	const query = `SELECT ${selectString} FROM ${tableName} ${joinString} ${whereString} ${orderByString} ${limitString}`;

	return await getResult(query);

}


const numberFormate = (value)=>{
 
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';  
  return num.toFixed(2);
  
}

module.exports = {
  getBlobTempPublicUrl,
  toFullUrl,
  selectWithJoins,
  saveModel,
  updateModel,
  validateData,
  saveResizedImage,
  successResponse,
  errorResponse,
  uniqueId,
  cleanString,
  generateCode,
  ucFirst,
  categoryURL,
  checkemail,
  generateOTP,
  requiredmessage,
  selectWithJoinsV2,
  cartitemstotal,
  getResult,
  checkvendoremail,
  checkvendormobile,
  cartitemstotal,
  checkcouponfororderwithvendor,
  validPassword,
  validemail,
  validPhoneNnumber,
  checkEmail,
  checkmobile,
  cleanObject,
  mysql_unreal_escape_string,
  deleteRecord,
  generateBookingCode,
  timeSince,
  countryDetails,
  downloadImage,
  saveNotification,
  getFCMToken,
  selectWithJoinsOrV2,
  numberFormate
};