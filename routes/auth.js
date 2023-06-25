const express = require('express');
const multiparty = require('multiparty');
const bodyParser = require('body-parser');
const path = require('path');

//const mysqlConnection = require("../utils/database");
const cockroachDB = require("../utils/database");
const accountHelper = require("../utils/accountHelper");

const emailRegex = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/;
const passwordRegex = /^[A-Za-z0-9!@#$%^&*_\-.]*$/;

const router = express.Router();



/*
*   Outputs
*       accessToken: Randomly generated JWT access token
*       not_verified: User email has not been verified or password is wrong
*       invalid_fields: Email or password is invalid
*       expired: accessToken has expired
*/
router.post("/login", (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        if (req.get("Authorization")) {
            // Has accessToken => Login with email and accessToken
            console.log("Login with email and accessToken");
            if (await accountHelper.compareAccessToken(fields.email[0], req.get("Authorization")) == true) {
                var accessToken = await accountHelper.generateAccessToken(fields.email[0]);
                res.end(accessToken.toString());
            } else {
                res.end("expired");
            }
        } else {
            // No accessToken => Login with email and password
            console.log("Login with email and password");
            if (fields.email[0].match(emailRegex) && fields.password[0].match(passwordRegex)) {
                if (await accountHelper.getUserVerified(fields.email[0], fields.password[0]) == true) {
                    var accessToken = await accountHelper.generateAccessToken(fields.email[0]);
                    res.end(accessToken.toString());
                } else {
                    res.end("not_verified");
                }
            }
        }
    });
});

/*
*   Outputs:
*       success: User successfully registered
*       user_exists: An account with the email already exists
*       invalid_fields: Email or password is invalid
*/
router.post("/register", bodyParser.text({ type: "text/plain" }), (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        if (fields.email[0].match(emailRegex) && fields.password[0].match(passwordRegex)) {
            if (await accountHelper.checkUserExists(fields.email[0]) == false) {
                await accountHelper.insertUser(fields.email[0], fields.password[0])
                await accountHelper.insertVerification(fields.email[0]);
                await accountHelper.sendVerificationEmail(fields.email[0]);
                res.end("success");
            } else {
                res.end("user_exists");
            }
        } else {
            res.end("invalid_fields");
        }
    });
});

/*
*   Outputs:
*       success: Successfully verified user and sent a password reset email
*       invalid_fields: Email is invalid or user does not exist
*/
router.post("/resetPassword", (req, res) => {
    var form = new multiparty.Form();

    form.parse(req, async function(err, fields, files) {
        if (fields.email[0].match(emailRegex)) {
            if (await accountHelper.checkUserExists(fields.email[0]) == true) {
                await accountHelper.insertReset(fields.email[0]);
                await accountHelper.sendResetEmail(fields.email[0]);
                res.end("success");
            } else {
                res.end("invalid_fields");
            }
        } else {
            res.end("invalid_fields");
        }
    });
});

/*
*   Changes password for the user associated with the resetId
*/
router.post("/changePassword/:resetId", (req, res) => {
    cockroachDB.query(
        `SELECT userID, expiryDate FROM usersReset
        WHERE resetHash = $1`,
        [req.params.resetId],
        async function(err, result) {
            if (err) throw err;

            if (result.rowCount !== 0) {
                var dateNow = new Date();
                var expiryDate = new Date(result.rows[0].expirydate);

                if (dateNow < expiryDate) {
                    var hash = await accountHelper.hashPassword(req.body.newPassword);

                    cockroachDB.query(
                        `UPDATE users SET userPassHash = $1
                        WHERE userID = $2`,
                        [hash, result.rows[0].userid],
                        (err, result_) => {
                            if (err) throw err;
                            console.log("Updated new password");
                        }
                    )

                    cockroachDB.query(
                        `DELETE FROM usersReset
                        WHERE userID = $1`,
                        [result.rows[0].userid],
                        (err, result_) => {
                            if (err) throw err;
                            console.log("Removed reset link");
                        }
                    )

                    res.render("resetSuccess");
                }
            }
        }
    )
})

/*
*   Verify user identity
*/
router.get("/verify/:verifyId", (req, res) => {
    cockroachDB.query(
        `SELECT userID, expiryDate FROM usersVerification
        WHERE verificationHash = $1`,
        [req.params.verifyId],
        (err, result) => {
            if (err) throw err;

            if (result.rowCount !== 0) {
                var dateNow = new Date();
                var expiryDate = new Date(result.rows[0].expirydate);

                if (dateNow < expiryDate) {
                    cockroachDB.query(
                        `UPDATE users
                        SET verified = true
                        WHERE userID = $1`,
                        [result.rows[0].userid],
                        (err, result_) => {
                            if (err) throw err;
                            // console.log("Verified user");
                        }
                    )
                
                    cockroachDB.query(
                        `DELETE FROM usersVerification
                        WHERE verificationHash = $1`,
                        [req.params.verifyId],
                        (err, result_) => {
                            if (err) throw err;
                            // console.log("Removed verification link");
                        }
                    )

                    res.render("verificationPage");
                } else {
                    console.log("Verification link expired");

                    cockroachDB.query(
                        `DELETE FROM usersVerification
                        WHERE userID = $1`,
                        [result.rows[0].userid],
                        (err, result_) => {
                            if (err) throw err;
                            console.log("Removed verification link");
                        }
                    )

                    cockroachDB.query(
                        `DELETE FROM users
                        WHERE userID = $1`,
                        [result.rows[0].userid],
                        (err, result_) => {
                            if (err) throw err;
                            console.log("Removed user");
                        }
                    )
                }
            }
        }
    )
});

/*
*   Reset user password
*/
router.get("/reset/:resetId", (req, res) => {
    cockroachDB.query(
        `SELECT userID, expiryDate FROM usersReset
        WHERE resetHash = $1`,
        [req.params.resetId],
        (err, result) => {
            if (err) throw err;

            if (result.rowCount !== 0) {
                var dateNow = new Date();
                var expiryDate = new Date(result.rows[0].expirydate);

                if (dateNow < expiryDate) {
                    res.render("resetPassword", {
                        resetId: req.params.resetId,
                    });
                } else {
                    console.log("Reset link expired");

                    cockroachDB.query(
                        `DELETE FROM usersReset
                        WHERE userID = $1`,
                        [result.rows[0].userid],
                        (err, result_) => {
                            if (err) throw err;
                            console.log("Removed reset link");
                        }
                    )
                }
            }
        }
    )
});

module.exports = router;