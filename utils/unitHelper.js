require('dotenv').config();

const cockroachDB = require("./database");

/****************************************
*
*   PUBLIC METHODS
*
*****************************************/

function loadUnits(email) {
    return new Promise((resolve, reject) => {
        Promise.all(
            [queryUnits(email)]
        ).then((result) => {
            resolve({
                "units": result[0]
            });
        });
    });
}

/****************************************
*
*   PRIVATE METHODS
*
*****************************************/

/*
*   Query the characters for the user
*/
function queryUnits(email) {
    return new Promise((resolve, reject) => {
        var select = `SELECT userscards.cardid, characters.skinname, characters.charactername, userscards.characterlevel, characters.combattype, ` +
                     `characters.animename, characters.rarity, characters.element, characters.tags, charactersbasestats.hp, charactersbasestats.atk, ` +
                     `charactersbasestats.def, charactersbasestats.mag, charactersbasestats.res, charactersbasestats.spd FROM users `;
        var join = `JOIN userscards ON users.userid = userscards.userid ` +
                   `JOIN characters ON userscards.characterid = characters.characterid ` +
                   `JOIN charactersbasestats ON characters.characterid = charactersbasestats.characterid `;
        var condition = `WHERE users.useremail = $1 `;
        var order = `ORDER BY characters.rarity DESC`;
        var query = select + join + condition + order;

        cockroachDB.query(
            query,
            [email],
            (err, result) => {
                if (err) throw err;
    
                if (result.rowCount !== 0) {
                    resolve(result.rows);
                }
            }
        );
    });
}

module.exports = { 
    loadUnits,
}