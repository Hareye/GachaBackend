require('dotenv').config();

const { Client } = require('pg');

const cockroachDB = new Client(process.env.DB_STRING);

cockroachDB.connect().then(() => {
    console.log("Connected to CockroachDB");
}).catch((err) => {
    console.log("Error connecting to CockroachDB: " + err);
});

module.exports = cockroachDB;