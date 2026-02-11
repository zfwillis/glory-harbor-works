import app from "./src/app.js";

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

require("dotenv").config();



const dbConnect = require("./DBConnection.js");

const ExpressApp = require('./App.js');

dbConnect.connect();

ExpressApp.app.listen(process.env.PORT,process.env.HOSTNAME,function(){ // Listen to client requests in hostname:port
    console.log(`Server Running on ${process.env.HOSTNAME}:${process.env.PORT}...`);
});