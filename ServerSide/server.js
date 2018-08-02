let WebSocketServer = require('ws').Server;
wss = new WebSocketServer({port:8080});

wss.on('connection', function (ws) {
    console.log("Client Connected");
    ws.on('message', function(msg) {
        requestDetails = JSON.parse(msg);
        console.log(requestDetails.url);

        //console.log(msg);
    })
});