let WebSocketServer = require('ws').Server;
wss = new WebSocketServer({port:8080});

let MongoClient = require("mongodb").MongoClient;
let dbUrl = "mongodb://localhost:27017"; //For test purpose only! Don't use this in production environment!!!

function writeDataintoDB(MongoClient, dbUrl, dataObject) {
    MongoClient.connect(dbUrl)
    .then(function(db) {
        let dbase = db.db("YPTN-Client");
        dbase.createCollection("access-sites")
        .then(function(dbCollection) {
            console.log("Collection Switched!");
            dbCollection.insertOne(dataObject, function(res, err) {
            });
        }).catch(function(err) {
            console.log("Create Collection went wrong");
        });
    }).catch(function(err) {
        console.log("Change DB went wrong");
    });
}



wss.on('connection', function (ws) {
    console.log("Client Connected");
    ws.on('message', function(msg) {
        requestDetails = JSON.parse(msg);
        console.log(msg);
        //console.log(requestDetails.url);
        writeDataintoDB(MongoClient, dbUrl, requestDetails);
        //console.log(msg);
    })
});