const express = require('express');
const multiparty = require('multiparty');

const unitHelper = require("../utils/unitHelper");
const tokenHelper = require("../utils/tokenHelper");

const router = express.Router();

router.get("/load", (req, res) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        if (req.get("authToken")) {
            // Has authorization token
            var authToken = JSON.parse(req.get("authToken"));

            if (await tokenHelper.verifyAuthToken(authToken)) {
                // authToken verified
                var email = await tokenHelper.getIDFromToken(authToken);
                var units = await unitHelper.loadUnits(email);

                res.end(JSON.stringify(units));
            } else {
                // authToken has expired
                console.log("Expired!");
                res.end("expired");
            }
        } else {
            // No authorization token
        }
    });
});

module.exports = router;