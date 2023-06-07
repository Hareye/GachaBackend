const express = require('express');
const multiparty = require('multiparty');
const bodyParser = require('body-parser');
const gacha = require('./routes/gacha');
const mysqlConnection = require("./utils/database");

const server = express();
const PORT = 3000;

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(bodyParser.json());

server.use("/gacha", gacha);

server.post("/authenticate", (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
        console.log(fields);
        console.log(fields.email);
    });

    res.end("Test Token");
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})