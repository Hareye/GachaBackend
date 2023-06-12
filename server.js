const express = require('express');
const path = require('path');

const gacha = require('./routes/gacha');
const auth = require('./routes/auth');

const server = express();
const PORT = 3000;

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.set('views', path.join(__dirname + "/views"));
server.set("view engine", "ejs");

server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    next();
});

server.use("/gacha", gacha);
server.use("/auth", auth);

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})