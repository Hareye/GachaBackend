const express = require('express');
const nodemailer = require("nodemailer");
const multiparty = require('multiparty');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const nodemailerConfig = require("./utils/nodemailerConfig");
const mysqlConnection = require("./utils/database");
const config = require("./utils/config");
const gacha = require('./routes/gacha');

const transporter = nodemailer.createTransport(nodemailerConfig);
const server = express();
const PORT = 3000;

const emailRegex = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/;
const passwordRegex = /^[A-Za-z0-9!@#$%^&*_\-.]*$/;
const saltRounds = 10;

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(bodyParser.json());

server.use("/gacha", gacha);

/*
*   Outputs
*       accessToken: Randomly generated JWT access token
*       failed: User failed to login (invalid email or password)
*       expired: accessToken has expired
*/
server.post("/login", (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        if (fields.accessToken[0] == "empty") {
            // Login with email and password
            console.log("Login with email and password");
            if (fields.email[0].match(emailRegex) && fields.password[0].match(passwordRegex)) {
                try {
                    if (await verifyUser(fields.email[0], fields.password[0]) == true) {
                        var accessToken = await generateAccessToken(fields.email[0]);
                        res.end(accessToken.toString());
                    } else {
                        res.end("failed");
                    }
                } catch (error) {
                    console.log(error);
                }
            } else {
                res.end("failed");
            }
        } else {
            // Login with email and accessToken
            console.log("Login with email and accessToken");
            if (fields.email[0].match(emailRegex)) {
                if (await compareAccessToken(fields.email[0], fields.accessToken[0]) == true) {
                    var accessToken = await generateAccessToken(fields.email[0]);
                    res.end(accessToken.toString());
                } else {
                    res.end("expired");
                }
            }
        }
    });
});

/*
*   Outputs:
*       success: User successfully registered
*       failed: User failed to register (invalid email or password)
*/
server.post("/register", (req, res) => {
    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
        if (fields.email[0].match(emailRegex) && fields.password[0].match(passwordRegex)) {
            registerUser(fields.email[0], fields.password[0]);
            res.end("success");
        } else {
            res.end("failed");
        }
    });
});

/*
*   Outputs:
*       true: User exists
*       false: User does not exist
*       failed: Email not valid
*/
server.post("/checkUser", (req, res) => {
    var form = new multiparty.Form();

    form.parse(req, async function(err, fields, files) {
        if (fields.email[0].match(emailRegex)) {
            try {
                var userExists = await checkUserExists(fields.email[0]);
                res.end(userExists.toString());
            } catch (error) {
                console.log(error);
            }
        } else {
            res.end("failed");
        }
    });
})

/*
*   Verify user identity
*/
server.get("/verify/:verifyId", (req, res) => {
    mysqlConnection.query(
        `SELECT expiryDate FROM verification
        WHERE verificationHash = ?`,
        [req.params.verifyId],
        (err, rows, fields) => {
            if (err) throw err;

            if (Object.keys(rows).length !== 0) {
                var dateNow = Date.now();

                if (dateNow <= rows[0].expiryDate) {
                    mysqlConnection.query(
                        `UPDATE users
                        SET verified = true
                        WHERE userID = (SELECT userID FROM verification
                                        WHERE verificationHash = ?)`,
                        [req.params.verifyId],
                        (err, rows, fields) => {
                            if (err) throw err;
                            // console.log("Verified user");
                        }
                    )
                
                    mysqlConnection.query(
                        `DELETE FROM verification
                        WHERE verificationHash = ?`,
                        [req.params.verifyId],
                        (err, rows, fields) => {
                            if (err) throw err;
                            // console.log("Removed verification link");
                        }
                    )
                } else {
                    console.log("Verification link expired");
                }
            }
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
*   Generate JWT access token for user
*/
function generateAccessToken(email) {
    return new Promise((resolve, reject) => {
        resolve(jwt.sign( { id: email }, config.token_secret, { expiresIn: '7d' }));
    });
}

function compareAccessToken(email, token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.token_secret, function(err, decoded) {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    resolve(false);
                } else {
                    throw err;
                }
            }

            if (decoded.id === email) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/*
*   Verify the login information for the user
*/
function verifyUser(email, password) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query(
            `SELECT userPassHash FROM users
            WHERE userEmail = ?
            AND verified = true`,
            [email],
            (err, rows, fields) => {
                if (err) throw err;

                if (Object.keys(rows).length !== 0) {
                    bcrypt.compare(password, rows[0].userPassHash, function(err, result) {
                        if (result) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                } else {
                    resolve(false);
                }

            }
        )
    });
}

/*
*   Checks if email is already associated with an account in the SQL database
*/
function checkUserExists(email) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query(
            `SELECT EXISTS (SELECT userEmail FROM users
            WHERE userEmail = ?) AS userExists`,
            [email],
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
                    VALUES (false, ?, ?, "Guest")`,
                    [email, hash],
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
                VALUES ((SELECT userID FROM users WHERE userEmail = ?), ?, FROM_UNIXTIME(?))`,
                [email, verToken, expiryDate],
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
        WHERE userID = (SELECT userID FROM users WHERE userEmail = ?)`,
        [receiver],
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