function checktoken (req, res, next) {
    
    if ("2ed1b72407c91c22dc7bd2b729f67145" != req.headers.apitoken) {
      res.status(401).json({
        status: 401,
        message: "Authentication failed!!",
      });
    } else {
      next();
    }
};

module.exports={
    checktoken
}