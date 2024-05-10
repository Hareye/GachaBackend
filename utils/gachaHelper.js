require('dotenv').config();

const jwt = require('jsonwebtoken');
const cockroachDB = require("./database");

/*
*   Universal Rates
*   1*: 80%
*   2*: 15%
*   3*: 5%
*/

/*
*   Extracts the user email from the JWT authToken
*
*   Note: Should be running checkAuthExpired before this function call to ensure that token has not expired
*/
function getEmailFromToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) {
                // Throw error if there was an issue with verifying user identity
                throw err;
            }

            resolve(decoded.id);
        });
    })
}

/*
*   Check if authToken has expired
*/
function checkAuthExpired(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    resolve(true);
                } else {
                    // If any other errors occur, just treat it as authToken expired for now
                    resolve(true);
                }
            }

            resolve(false);
        });
    })
}

function standardPull(pulls) {

}

function focusPull(banner, pulls) {

}

/*
*   Load the rates for the selected banner
*/
function loadRates(banner, anime) {
    return new Promise((resolve, reject) => {
        if (banner === "Standard") {
            cockroachDB.query(
                `SELECT COUNT(charactername) AS totalCharacters,
                (SELECT COUNT(rarity) FROM characters WHERE rarity = 1) AS totalOneStars,
                (SELECT COUNT(rarity) FROM characters WHERE rarity = 2) AS totalTwoStars,
                (SELECT COUNT(rarity) FROM characters WHERE rarity = 3) AS totalThreeStars
                FROM characters`,
                (err, result) => {
                    if (err) throw err;
    
                    if (result.rowCount !== 0) {
                        //console.log(result.rows[0].totalcharacters);
                        //console.log(result.rows[0].totalonestars);
                        //console.log(result.rows[0].totaltwostars);
                        //console.log(result.rows[0].totalthreestars);

                        //var oneStarRates = 80 / result.rows[0].totalonestars;
                        var twoStarRates = 15 / result.rows[0].totaltwostars;
                        var threeStarRates = 5 / result.rows[0].totalthreestars;
    
                        resolve({
                            twoStarRates: twoStarRates,
                            threeStarRates: threeStarRates
                        });
                    }
    
                }
            )
        }
    });
}

module.exports = { 
    getEmailFromToken, checkAuthExpired, loadRates
}