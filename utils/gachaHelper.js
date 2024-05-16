require('dotenv').config();

const cockroachDB = require("./database");

/*
*   Universal Rates
*   R*: 80%
*   SR*: 15%
*   UR*: 5%
*/

const rRate = 80;
const srRate = 15;
const urRate = 5;

const rates = {
    rRates: rRate,
    srRates: srRate,
    urRates: urRate,
}

/****************************************
*
*   PUBLIC METHODS
*
*****************************************/

function standardPull(pulls) {

}

function focusPull(banner, pulls) {

}

/*
*   Load the rates for the selected banner
*/
function loadRates(anime, character) {
    return new Promise((resolve, reject) => {
        if (anime) {
            // If anime was passed in => Focus Banner
            Promise.all(
                [queryRates(anime), queryCharacters(anime)]
            ).then((result) => {
                resolve({
                    ...rates,
                    ...result[0],
                    characters: result[1],
                });
            });
        } else if (character) {
            // If character was passed in => Character Banner
            console.log("Load rate up test!");
        } else {
            // If neither was passed in => Standard Banner
            Promise.all(
                [queryRates(), queryCharacters()]
            ).then((result) => {
                resolve({
                    ...rates,
                    ...result[0],
                    characters: result[1],
                });
            });
        }
    });
}

/****************************************
*
*   PRIVATE METHODS
*
*****************************************/

/*
*   Query the rates for the selected banner
*/
function queryRates(anime) {
    return new Promise((resolve, reject) => {
        var query = `SELECT COUNT(charactername) AS totalCharacters,
                    (SELECT COUNT(rarity) FROM characters WHERE rarity = 'R') AS totalR,
                    (SELECT COUNT(rarity) FROM characters WHERE rarity = 'SR') AS totalSR,
                    (SELECT COUNT(rarity) FROM characters WHERE rarity = 'UR') AS totalUR
                    FROM characters`;
        var queryParam = [];
    
        if (anime) {
            query += ` WHERE animename = $1`;
            queryParam.push(anime);
        }
    
        cockroachDB.query(
            query,
            queryParam,
            (err, result) => {
                if (err) throw err;
    
                if (result.rowCount !== 0) {
                    //console.log(result.rows[0].totalcharacters);
    
                    var rCharacterRates = rRate / result.rows[0].totalr;
                    var srCharacterRates = srRate / result.rows[0].totalsr;
                    var urCharacterRates = urRate / result.rows[0].totalur;
    
                    resolve({
                        rCharacterRates: rCharacterRates,
                        srCharacterRates: srCharacterRates,
                        urCharacterRates: urCharacterRates,
                    });
                }
            }
        )
    });
}

/*
*   Query the characters for the selected banner
*/
function queryCharacters(anime) {
    return new Promise((resolve, reject) => {
        var query = `SELECT charactername, rarity FROM characters`;
        var queryParam = [];
    
        if (anime) {
            query += ` WHERE animename = $1`;
            queryParam.push(anime);
        }

        cockroachDB.query(
            query,
            queryParam,
            (err, result) => {
                if (err) throw err;
    
                if (result.rowCount !== 0) {
                    resolve(result.rows);
                }
            }
        )
    });
}

module.exports = { 
    loadRates
}