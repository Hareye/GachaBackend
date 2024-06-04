require('dotenv').config();

const nodemailer = require("nodemailer");
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const nodemailerConfig = require("./nodemailerConfig");
const cockroachDB = require("./database");

const transporter = nodemailer.createTransport(nodemailerConfig);
const saltRounds = 10;

/*
*   Check if the user has verified yet
*/
function getUserVerified(email, password) {
    return new Promise((resolve, reject) => {
        var query = `SELECT userPassHash FROM users ` +
                    `WHERE userEmail = $1 ` +
                    `AND verified = true`;

        cockroachDB.query(
            query,
            [email],
            (err, result) => {
                if (err) throw err;

                if (result.rowCount !== 0) {
                    bcrypt.compare(password, result.rows[0].userpasshash, function(err, result_) {
                        if (result_) {
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
*   Check if email is already associated with an account in the SQL database
*/
function checkUserExists(email) {
    return new Promise((resolve, reject) => {
        var query = `SELECT EXISTS (SELECT userEmail FROM users ` +
                    `WHERE userEmail = $1) AS userExists`;

        cockroachDB.query(
            query,
            [email],
            (err, result) => {
                if (err) throw err;

                if (result.rows[0].userexists) {
                    console.log("User already exists");
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        )
    });
}

/*
*   Hashes password
*/
function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(saltRounds, function(err, salt) {
            if (err) throw err;
            bcrypt.hash(password, salt, function(err, hash) {
                if (err) throw err;
                resolve(hash);
            });
        });
    });
}

/*
*   Inserts a new user into the SQL database
*/
function insertUser(email, password) {
    return new Promise(async function(resolve, reject) {
        var hash = await hashPassword(password);
        var query = `INSERT INTO users (verified, userEmail, userPassHash, userDisplayName) ` +
                    `VALUES (false, $1, $2, 'Guest')`;
        
        cockroachDB.query(
            query,
            [email, hash],
            (err, result) => {
                if (err) throw err;
                console.log("Inserted user: " + email);
                resolve();
            }
        )
    });
}

/*
*   Inserts a randomly generated hash into SQL database for the new user to verify their account
*/
function insertVerification(email) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(48, function(err, buf) {
            var verToken = buf.toString('hex');
            var expiryDate = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString();
            var query = `INSERT INTO usersVerification (userID, verificationHash, expiryDate) ` +
                        `VALUES ((SELECT userID FROM users WHERE userEmail = $1), $2, $3)`;
            
            cockroachDB.query(
                query,
                [email, verToken, expiryDate],
                (err, result) => {
                    if (err) throw err;
                    console.log("Inserted verification: " + verToken);
                    resolve();
                }
            );
        });
    });
}

/*
*   Inserts a randomly generated hash into SQL database for user to reset password
*/
function insertReset(email) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, function(err, buf) {
            var resetToken = buf.toString('hex');
            var expiryDate = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString();
            var query = `INSERT INTO usersReset (userID, resetHash, expiryDate) ` +
                        `VALUES ((SELECT userID FROM users WHERE userEmail = $1), $2, $3)`;
    
            cockroachDB.query(
                query,
                [email, resetToken, expiryDate],
                (err, result) => {
                    if (err) throw err;
                    console.log("Inserted reset: " + resetToken);
                    resolve();
                }
            );
        });
    })
}

/*
*   Send a verification email to the new user
*/
function sendVerificationEmail(receiver) {
    return new Promise((resolve, reject) => {
        var query = `SELECT verificationHash FROM usersVerification ` +
                    `WHERE userID = (SELECT userID FROM users WHERE userEmail = $1)`;

        cockroachDB.query(
            query,
            [receiver],
            (err, result) => {
                if (err) throw err;

                var data = {
                    "from": process.env.EMAIL,
                    "to": receiver,
                    "subject": "Verify your account for Gacha Game",
                    "text": "Verify your account by clicking on this link: " + process.env.ROOT + "auth/verify/" + result.rows[0].verificationhash + ". \n\n" +
                            "This link will expire in 1 hour."
                }
    
                transporter.sendMail(data, function (err, info) {
                    if (err) {
                        console.log("Error sending mail: " + err);
                        resolve();
                    } else {
                        console.log("Sent mail successfully");
                        resolve();
                    }
                });
            }
        );
    })
}

/*
*   Sends a password reset email to the user
*/
function sendResetEmail(receiver) {
    return new Promise((resolve, reject) => {
        var query = `SELECT resetHash FROM usersReset ` +
                    `WHERE userID = (SELECT userID FROM users WHERE userEmail = $1)`;

        cockroachDB.query(
            query,
            [receiver],
            (err, result) => {
                if (err) throw err;

                var data = {
                    "from": process.env.EMAIL,
                    "to": receiver,
                    "subject": "Reset the password for your account",
                    "text": "Reset your password by clicking on this link: " + process.env.ROOT + "auth/reset/" + result.rows[0].resethash + ". \n\n" +
                            "This link will expire in 1 hour."
                }

                transporter.sendMail(data, function(err, info) {
                    if (err) {
                        console.log("Error sending mail: " + err);
                        resolve();
                    } else {
                        console.log("Sent mail successfully");
                        resolve();
                    }
                });
            }
        )
    })
}

module.exports = { 
    getUserVerified, checkUserExists, insertUser, insertVerification, sendVerificationEmail, 
    sendResetEmail, insertReset, hashPassword,
}