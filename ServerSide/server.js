let WebSocketServer = require('ws').Server;
wss = new WebSocketServer({port:8080});

let MongoClient = require("mongodb").MongoClient;
let dbUrl = "mongodb://localhost:27017"; //For test purpose only! Don't use this in production environment!!!

function writeDataintoDB(MongoClient, dbUrl, dataObject, collectionName) {
    MongoClient.connect(dbUrl)
    .then(function(db) {
        let dbase = db.db("YPTN-Client");
        dbase.createCollection(collectionName)
        .then(function(dbCollection) {
            console.log("Collection Switched!");
            console.log(removeDuplicateHeaders(dbCollection, "url"));
            dbCollection.insertOne(dataObject, function(res, err) {
            });
        }).catch(function(err) {
            console.log("Create Collection went wrong");
        });
    }).catch(function(err) {
        console.log("Change DB went wrong");
    });
}

function removeDuplicateHeaders(dbCollection, keyWord) {
    return dbCollection.aggregate({$group:{_id: keyWord, total_num:{$sum:1}}});

}


wss.on('connection', function (ws) {
    console.log("Client Connected");
    ws.on('message', function(msg) {
        msg = JSON.parse(msg);
        if(msg.identity === "requestDetails") {
            // console.log(msg);
            // console.log(requestDetails.url);
            writeDataintoDB(MongoClient, dbUrl, msg, collectionName="access-sites");
            //console.log(msg);
        }
        else if(msg.identity === "requestHeaders") {
            console.log(msg["User-Agent"]);
            
        }
    });
});