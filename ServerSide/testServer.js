// var app = require('express')();
// var server = require('http').Server(app);
// var WebSocket = require('ws');
//
// var wss = new WebSocket.Server({ port: 8080 });
//
// wss.on('connection', function connection(ws) {
//     console.log('server: receive connection.');
//
//     ws.on('message', function incoming(message) {
//         console.log('server: received: %s', message);
//     });
//
//     ws.send('world');
// });
//
// app.get('/', function (req, res) {
//     res.sendfile(__dirname + '/index.html');
// });
//
// app.listen(3000);
let runSelfUpdateInterval = setInterval(() => {
    console.log("This shows every 1 seconds");
}, 1000);

clearInterval(runSelfUpdateInterval);
let runSelfUpdateIntervalNew = setInterval(() => {
    console.log("This shows every 2 seconds");
}, 2000);