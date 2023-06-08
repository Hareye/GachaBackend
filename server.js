const express = require('express');
const nodemailer = require("nodemailer");
const multiparty = require('multiparty');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const nodemailerConfig = require("./utils/nodemailerConfig");
const mysqlConnection = require("./utils/database");
const config = require("./utils/config");
const gacha = require('./routes/gacha');

const transporter = nodemailer.createTransport(nodemailerConfig);
const server = express();
const PORT = 3000;

const saltRounds = 10;

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

server.post("/register", (req, res) => {
    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
        registerUser(fields.email[0], fields.password[0]);
    });
});

server.post("/checkUser", (req, res) => {
    var form = new multiparty.Form();

    form.parse(req, async function(err, fields, files) {
        try {
            var userExists = await checkUserExists(fields.email[0]);
            res.end(userExists.toString());
        } catch (error) {
            console.log(error);
        }
    });
})

/*
*   TO-DO: Add a check if verification link expired yet
*/
server.get("/verify/:verifyId", (req, res) => {
    mysqlConnection.query(
        `UPDATE users
        SET verified = true
        WHERE userID = (SELECT userID
                        FROM verification
                        WHERE verificationHash = "${req.params.verifyId}")`,
        (err, rows, fields) => {
            if (err) throw err;
            // console.log("Verified user");
        }
    )

    mysqlConnection.query(
        `DELETE FROM verification
        WHERE verificationHash = "${req.params.verifyId}"`,
        (err, rows, fields) => {
            if (err) throw err;
            // console.log("Removed verification link");
        }
    )
});

async function registerUser(email, password) {
    try {
        if (await checkUserExists(email) == false) {
            await insertUser(email, password);
            await insertVerification(email);
            sendEmail(email);
        }
    } catch (error) {
        console.log("An error occurred: " + error);
    }
}

/*
*   Checks if email is already associated with an account in the SQL database
*/
function checkUserExists(email) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query(
            `SELECT EXISTS (SELECT userEmail FROM users
            WHERE userEmail = "${email}") AS userExists`,
            (err, rows, fields) => {
                if (err) throw err;

                if (rows[0].userExists) {
                    console.log("User already exists");
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            }
        );
    });
}

/*
*   Inserts a new user into the SQL database
*/
function insertUser(email, password) {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(saltRounds, function(err, salt) {
            if (err) throw err;
            bcrypt.hash(password, salt, function(err, hash) {
                if (err) throw err;
                mysqlConnection.query(
                    `INSERT INTO users (verified, userEmail, userPassHash, userDisplayName)
                    VALUES (false, "${email}", "${hash}", "Guest")`,
                    (err, rows, fields) => {
                        if (err) throw err;
                        console.log("Inserted user: " + email);
                        resolve();
                    }
                );
            });
        });
    });
}

/*
*   Inserts a randomly generated hash into SQL database for the new user to verify their account
*/
function insertVerification(email) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, function(err, buf) {
            var verToken = buf.toString('hex');
            var expiryDate = (Date.now() / 1000) + 3600;
    
            mysqlConnection.query(
                `INSERT INTO verification (userID, verificationHash, expiryDate)
                VALUES ((SELECT userID FROM users WHERE userEmail = "${email}"), "${verToken}", FROM_UNIXTIME(${expiryDate}))`,
                (err, rows, fields) => {
                    if (err) throw err;
                    console.log("Inserted verification: " + verToken);
                    resolve();
                }
            );
        });
    });
}

/*
*   Send a verification email to the new user
*/
function sendEmail(receiver) {
    mysqlConnection.query(
        `SELECT verificationHash FROM verification
        WHERE userID = (SELECT userID FROM users WHERE userEmail = "${receiver}")`,
        (err, rows, fields) => {
            if (err) throw err;
            var data = {
                "from": config.email,
                "to": receiver,
                "subject": "Verify your account for {INSERT GAME NAME HERE}",
                "text": "Verify your account by clicking on this link: " + config.root + "verify/" + rows[0].verificationHash + ". \n\n" +
                        "This link will expire in 1 hour."
            }

            transporter.sendMail(data, function (err, info) {
                if (err)
                    console.log("Error sending mail: " + err);
                else
                    console.log("Sent mail successfully");
            });
        }
    );
}

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})