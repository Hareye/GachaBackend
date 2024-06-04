const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
//const ws = require('ws');

const gacha = require('./routes/gacha');
const unit = require('./routes/unit');
const auth = require('./routes/auth');
const token = require('./routes/token');
const socket = require('./routes/socket');

const server = express();
const PORT = 3000;

expressWs(server);

// Middleware
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    next();
});

// Set directory for views and the view engine
server.set('views', path.join(__dirname + "/views"));
server.set("view engine", "ejs");

// Routing
server.use("/gacha", gacha);
server.use("/unit", unit);
server.use("/auth", auth);
server.use("/token", token);
server.use("/socket", socket);

// Start the server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});