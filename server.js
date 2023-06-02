var express = require('express');
var testRoute = require('./routes/testRoute');
var server = express();

const PORT = 3000;

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use("/testRoute", testRoute);

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})