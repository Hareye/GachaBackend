const express = require('express');
const multiparty = require('multiparty');
const cockroachDB = require("../utils/database");

const gachaHelper = require("../utils/gachaHelper");
const tokenHelper = require("../utils/tokenHelper");

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
            var authToken = JSON.parse(req.get("authToken"));

            if (await tokenHelper.verifyAuthToken(authToken)) {
                // authToken verified
                var email = await tokenHelper.getIDFromToken(authToken);

                if (fields.banner[0] === "Standard") {
                    var unitsPulled = await gachaHelper.pull(email, fields.pulls[0]);
                } else if (fields.banner[0] === "Focus") {
                    var unitsPulled = await gachaHelper.pull(email, fields.pulls[0], fields.anime[0]);
                }

                res.end(JSON.stringify(unitsPulled));
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

/*
*   Outputs:
*       rates: Contains the equal rates of each character in each rarity
*/
router.post('/rates', (req, res, next) => {
    var form = new multiparty.Form();
    form.parse(req, async function(err, fields, files) {
        var rates;

        console.log("Loading rates for: " + fields.banner[0]);

        if (fields.banner[0] === "Standard") {
            rates = JSON.stringify(await gachaHelper.loadRates());
        } else if (fields.banner[0] === "Focus") {
            rates = JSON.stringify(await gachaHelper.loadRates(fields.anime[0]));
        }

        res.end(rates);
    });
});

module.exports = router;