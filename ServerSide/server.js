let WebSocketServer = require('ws').Server;
wss = new WebSocketServer({port:8080});
let requestCache;
let MongoClient = require("mongodb").MongoClient;
let dbUrl = "mongodb://localhost:27017"; //For test purpose only! Don't use this in the production environment!!!
//I am supposed to use emit here, but to use emit in the
//client side, the native websocket doesn't support the emit method.
//The current solution is adding an identifier to the json file
function writeDataintoDB(MongoClient, dbUrl, dataObject, collectionName) {
    MongoClient.connect(dbUrl)
    .then(function(db) {
        let dbase = db.db("YPTN-Client");
        dbase.createCollection(collectionName)
        .then(function(dbCollection) {
            if(collectionName === "access-sites") {
                console.log("Collection Switched!");
                //console.log(removeDuplicateHeaders(dbCollection, "url"));
                dbCollection.insertOne(dataObject, function(res, err) {
                });
            }
            else if(collectionName === "user-history") {
                dbCollection.findOne(dataObject, (err, res) => {
                    if(err) {console.log(err);}
                    else if(res) {
                        console.log("Find duplicates: ", res);
                    }
                    else {
                        dbCollection.insertOne(dataObject, (err, res) =>{});
                    }
                }); 
            }
            else if(collectionName === "testUserAgent") {
                    //write the request into the db based on the user agnet
                    dbCollection.insertOne(dataObject, (err, res) => {});
            }
        }).catch(function(err) {
            console.log(err);
        });
    }).catch(function(err) {
        console.log("Change DB went wrong");
    });
}
/*
function removeDuplicateHeaders(dbCollection, keyWord) {
    console.log("Start Finding Duplicates");
    console.log(
    dbCollection.aggregate({$group:
        {_id: {url:"$url"}, 
        total_num:{$sum:1}
    }}));
}
*/
function findAccessRanking(MongoClient, dbUrl, collectionName) {
    console.log("Start Finding Duplicates...");
    MongoClient.connect(dbUrl)
    .then(function(db) {
        let dbase = db.db("YPTN-Client");
        dbase.createCollection(collectionName)
        .then(function(dbCollection) {
        console.log("Collection Switched!");
            dbCollection.aggregate([
                {
                    $group: {
                    _id: {url: "$url"},
                    count: {$sum: 1}},
                }
            ]).toArray((err, res) => {
                console.log(res);
                //DO something with the res

            });
        }).catch(function(err) {
            console.log(err);
        });
    }).catch(function(err) {
        console.log("Change DB went wrong");
    });
}

wss.on('connection', function (ws) {
    console.log("Client Connected");
    ws.on('message', function(msg) {
        msg = JSON.parse(msg);
        if(msg.identity === "requestDetails") {
            // console.log(msg);
            // console.log(requestDetails.url);
            //writeDataintoDB(MongoClient, dbUrl, msg, collectionName="access-sites");
            //console.log(msg);
            requestCache = msg;
        }
        else if(msg.identity === "requestHeaders") {
            console.log(msg["User-Agent"]);
            writeDataintoDB(MongoClient, dbUrl, {"User-Agent": msg["User-Agent"]}, collectionName="user-history");
            //findAccessRanking(MongoClient, dbUrl, collectionName="access-sites");
            console.log("requestCache is ", requestCache);
            writeDataintoDB(MongoClient, dbUrl, requestCache, collectionName = "testUserAgent");
            
        }
    });
});