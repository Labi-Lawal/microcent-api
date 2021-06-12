const mongoose = require('mongoose');

//connect to mongodb
mongoose.connect(process.env.DB_CONN, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.connection.once('open', ()=>{
    console.log('Connection to local database is established..........');
}).on('error', (error)=>{
    console.log('There was an error connecting to the database', error);
});



