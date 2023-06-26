require('dotenv').config();

/*
const mysql = require('mysql')

const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_SQL_USER,
    password: process.env.DB_SQL_PASS,
    database: process.env.DB_SQL_NAME
});

mysqlConnection.connect((err) => {
    if (!err) {
        console.log("Connected to database");
    } else {
        console.log("Failed to connect to database");
    }
});
*/

const { Client } = require('pg');

const cockroachDB = new Client(process.env.DB_STRING);

cockroachDB.connect().then(() => {
    console.log("Connected to CockroachDB");
}).catch((err) => {
    console.log("Error connecting to CockroachDB: " + err);
});

//module.exports = mysqlConnection;
module.exports = cockroachDB;