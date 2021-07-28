const express = require('express');
const server = express();
var eccrypto = require("eccrypto");
const userRoutes = require('./api/v1/routes/userRoutes');
const partnerRoutes = require('./api/v1/routes/partnerRoutes');
require('./config/DatabaseConfig');


server.use('/user', userRoutes);
server.use('/partner', partnerRoutes);


var port = process.env.PORT;
server.listen(port, ()=>{
   console.log(`****** MICROCENT server is running on port ${port} ******`);
});


