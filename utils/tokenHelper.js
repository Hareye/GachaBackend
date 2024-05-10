require('dotenv').config();

const jwt = require('jsonwebtoken');

/*
*   Generate JWT access token for user
*/
function generateAuthToken(email) {
    return new Promise((resolve, reject) => {
        var payload = {
            id: email,
            type: "auth",
            // Expires in 1 day
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        }
        resolve(jwt.sign(payload, process.env.TOKEN_SECRET));
    });
}

/*
*   Generate JWT remember token for user
*/
function generateRememberToken(email) {
    return new Promise((resolve, reject) => {
        var payload = {
            id: email,
            type: "remember",
            // Expires in 7 days
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
        }
        resolve(jwt.sign(payload, process.env.TOKEN_SECRET));
    });
}

/*
*   Return ID inside JWT auth token
*/
function getAuthTokenID(authToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(authToken, process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) throw err;

            if (decoded.exp > Math.floor(Date.now() / 1000) && decoded.type === "auth") {
                resolve(decoded.id);
            }

            resolve();
        });
    });
}

/*
*   Return ID inside JWT remember token
*/
function getRememberTokenID(rememberToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(rememberToken, process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) throw err;

            if (decoded.exp > Math.floor(Date.now() / 1000) && decoded.type === "remember") {
                resolve (decoded.id);
            }

            resolve();
        });
    })
}

/*
*   Verifies whether the access token is still valid
*/
function verifyAuthToken(authToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(authToken, process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) {
                // console.log(err);
                resolve(false);
            }

            if (decoded.exp > Math.floor(Date.now() / 1000) && decoded.type === "auth") {
                resolve(true);
            }

            resolve(false);
        });
    });
}

/*
*   Verifies whether the remember token is still valid
*/
function verifyRememberToken(rememberToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(rememberToken, process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) {
                // console.log(err)
                resolve(false);
            };

            if (decoded.exp > Math.floor(Date.now() / 1000) && decoded.type === "remember") {
                resolve(true);
            }

            resolve(false);
        });
    });
}

module.exports = { 
    generateAuthToken, generateRememberToken, getAuthTokenID, getRememberTokenID, verifyAuthToken,
    verifyRememberToken,
}