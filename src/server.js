const express = require('express');
const server = express();
const userRoutes = require('./api/v1/routes/userRoutes');
require('./config/DatabaseConfig');

server.use('/user', userRoutes);


var port = process.env.PORT;
server.listen(port, ()=>{
   console.log(`****** MICROCENT server is running on port ${port} ******`);
});


