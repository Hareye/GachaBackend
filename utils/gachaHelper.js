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

function pull(email, pulls, anime, character) {
    return new Promise((resolve, reject) => {
        if (anime) {
            // If anime was passed in => Focus Banner
        } else if (character) {
            // If character was passed in => Character Banner
        } else {
            // If neither was passed in => Standard Banner
            Promise.all(
                [queryCharacters()]
            ).then((result) => {
                var unitsPulled = pullCharacters(pulls, result);

                Promise.all(
                    [insertCharacters(email, unitsPulled)]
                ).then((result) => {
                    if (result) {
                        resolve({
                            "characters": unitsPulled
                        });
                    }
                });
            });
        }
    });
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
        var query = `SELECT ` +
                    `(SELECT COUNT(rarity) FROM characters WHERE rarity = 'R') AS totalR, ` +
                    `(SELECT COUNT(rarity) FROM characters WHERE rarity = 'SR') AS totalSR, ` +
                    `(SELECT COUNT(rarity) FROM characters WHERE rarity = 'UR') AS totalUR ` +
                    `FROM characters`;
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
        var query = `SELECT skinname, charactername, rarity FROM characters`;
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

/*
*   Insert characters into the database
*/
function insertCharacters(email, characters) {
    return new Promise((resolve, reject) => {
        var query = `INSERT INTO userscards (userid, characterid, characterlevel) ` +
                    `SELECT users.userid, characters.characterid, 1 FROM users, characters ` +
                    `WHERE users.useremail = $1 AND characters.skinname = $2 AND characters.charactername = $3`;

        for (var i = 0; i < characters.length; i++) {
            //console.log("Inserting character: " + characters[i].skinname + " - " + characters[i].charactername + " (" + characters[i].rarity + ") for user: " + email);
            cockroachDB.query(
                query,
                [email, characters[i].skinname, characters[i].charactername],
                (err, result) => {
                    if (err) throw err;
                }
            )
        }

        resolve(true);
    });
}

/*
*   Randomly pull characters from the pool
*/
function pullCharacters(pulls, result) {
    var urUnits = result[0].filter((character) => character.rarity === "UR");
    var srUnits = result[0].filter((character) => character.rarity === "SR");
    var rUnits = result[0].filter((character) => character.rarity === "R");
    var unitsPulled = [];

    for (var i = 0; i < pulls; i++) {
        var roll = Math.random();

        if (roll <= (urRate / 100)) {
            // UR unit
            unitsPulled.push(urUnits[Math.floor(Math.random() * urUnits.length)]);
        } else if (roll <= ((urRate + srRate) / 100)) {
            // SR unit
            unitsPulled.push(srUnits[Math.floor(Math.random() * srUnits.length)]);
        } else {
            // R unit
            unitsPulled.push(rUnits[Math.floor(Math.random() * rUnits.length)]);
        }
    }

    return unitsPulled;
}

module.exports = { 
    pull, loadRates
}