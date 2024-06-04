const express = require('express');
const expressWs = require('express-ws');

const router = express.Router();

expressWs(router);

router.ws('/', (ws, req) => {
    console.log("WebSocket connected");

    const socketId = ws._socket.remoteAddress;
    console.log("Socket Id: " + socketId);

    ws.on('message', function(msg) {
        console.log("Received: " + msg);
    });
});

module.exports = router;