const express = require('express');
const multiparty = require('multiparty');
const cockroachDB = require("../utils/database");

const gachaHelper = require("../utils/gachaHelper");

const router = express.Router();

/*
*   Outputs:
*       expired: authToken has expired
*/
router.post('/pull', (req, res, next) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        if (req.get("authToken")) {
            // Has authorization token
            if (!await gachaHelper.checkAuthExpired(req.get("authToken"))) {
                // authToken not expired
                var email = await gachaHelper.getEmailFromToken(req.get("authToken"));
                console.log(email);
                console.log(fields.pulls[0]);
                console.log(fields.banner[0]);
            } else {
                // authToken has expired
                res.end("expired");
            }
        } else {
            // No authorization token
        }
    });
});

/*
*   Outputs:
*       rates: Contains the equal rates of each character in each rarity
*/
router.post('/rates', (req, res, next) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        console.log(fields.banner[0]);

        var rates = JSON.stringify(await gachaHelper.loadRates(fields.banner[0]));
        res.end(rates);
    });
});

module.exports = router;