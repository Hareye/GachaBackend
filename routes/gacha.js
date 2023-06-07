const express = require('express');
const mysqlConnection = require("../utils/database");

const router = express.Router();

router.get('/', (req, res, next) => {
    res.end("Hello");
});

router.get('/pull/1', (req, res, next) => {
    
})

router.get('/pull/10', (req, res, next) => {

})

module.exports = router;