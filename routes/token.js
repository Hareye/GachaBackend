const express = require('express');
const multiparty = require('multiparty');
const bodyParser = require('body-parser');

const tokenHelper = require("../utils/tokenHelper");

const emailRegex = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/;

const router = express.Router();

/*
*   Outputs
*       authToken: Randomly generated JWT access token for authentication
*       invalid_fields: Email or password is invalid
*/
router.post("/generateAuthToken", (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        console.log("Generating auth token");
        if (fields.email[0].match(emailRegex)) {
            var authToken = await tokenHelper.generateAuthToken(fields.email[0]);
            res.end(authToken.toString());
        } else {
            res.end("invalid_fields");
        }
    });
});

/*
*   Outputs:
*       rememberToken: Randomly generated JWT access token for remembering user
*       invalid_fields: Email is invalid
*/
router.post("/generateRememberToken", bodyParser.text({ type: "text/plain" }), (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        console.log("Generating remember token");
        if (fields.email[0].match(emailRegex)) {
            var rememberToken = await tokenHelper.generateRememberToken(fields.email[0]);
            res.end(rememberToken.toString());
        } else {
            res.end("invalid_fields");
        }
    });
});

/*
*   Outputs:
*       email: Returns the email stored inside the remember token
*       not_verified: User remember token has not been verified
*/
router.post("/verifyRememberToken", (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        console.log("Verifying remember token");
        if (await tokenHelper.verifyRememberToken(fields.rememberToken[0])) {
            var email = await tokenHelper.getIDFromToken(fields.rememberToken[0]);
            console.log("... verified");
            res.end(email);
        } else {
            console.log("... not verified");
            res.end("not_verified");
        }
    });
})

module.exports = router;