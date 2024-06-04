require('dotenv').config();

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const algorithm = "aes-256-cbc";

/****************************************
*
*   PUBLIC METHODS
*
*****************************************/

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
        resolve(encrypt(jwt.sign(payload, process.env.TOKEN_SECRET)));
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
        resolve(encrypt(jwt.sign(payload, process.env.TOKEN_SECRET)));
    });
}

/*
*   Extract ID from tokens
*/
function getIDFromToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(decrypt(token), process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) throw err;

            resolve(decoded.id);
        });
    });
}

/*
*   Verifies whether the access token is still valid
*/
function verifyAuthToken(authToken) {
    return new Promise((resolve, reject) => {
        jwt.verify(decrypt(authToken), process.env.TOKEN_SECRET, function(err, decoded) {
            // JWT will automatically check for expiry and catch the error
            if (err) {
                /* if (err.name === 'TokenExpiredError') {
                    resolve(false);
                } */

                // console.log(err);
                resolve(false);
            }

            if (decoded.type === "auth") {
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
        jwt.verify(decrypt(rememberToken), process.env.TOKEN_SECRET, function(err, decoded) {
            if (err) {
                // console.log(err)
                resolve(false);
            };

            if (decoded.type === "remember") {
                resolve(true);
            }

            resolve(false);
        });
    });
}

/****************************************
*
*   PRIVATE METHODS
*
*****************************************/

/*
*   Encrypt the text
*/
function encrypt(text) {
    var iv = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv(algorithm, process.env.ENCRYPTION_KEY, iv);

    var encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

/*
*   Decrypt the text
*/
function decrypt(text) {
    var iv = Buffer.from(text.iv, 'hex');
    var encryptedText = Buffer.from(text.encryptedData, 'hex');
    var decipher = crypto.createDecipheriv(algorithm, process.env.ENCRYPTION_KEY, iv);

    var decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

module.exports = { 
    generateAuthToken, generateRememberToken, getIDFromToken, verifyAuthToken,
    verifyRememberToken
}