// A NodeJS server
let WebSocketServer = require('ws').Server;
wss = new WebSocketServer({port:8080});
let requestCache;
let MongoClient = require("mongodb").MongoClient;
let dbUrl = "mongodb://192.168.96.16:27017"; //For test purpose only! Don't use this in the production environment!!!
//I am supposed to use emit here, but to use emit in the
//client side, the native websocket doesn't support the emit method.
//The current solution is adding an identifier to the json file
//Implement a hashCode function to generate digest
String.prototype.hashCode = function() {
	let hash = 0;
	if(this.length == 0) return hash;
	for (let i = 0; i < this.length; i++) {
		let char = this.charCodeAt(i);
		hash = ((hash<<5) - hash) + char;
        hash = hash & hash;
	}
	return hash;
};

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
                    // console.log(dataObject);
                    dbCollection.insertOne(dataObject, (err, res) => {});
            }
        }).catch(function(err) {
            console.log(err);
        });
    }).catch(function(err) {
        console.log("Change DB went wrong: ", err);
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

function updateRanking(dbase,accessArray,collectionName, threshold) {
    dbase.createCollection(collectionName)
    .then(function(dbCollection){
        dbCollection.removeMany();
        accessArray.forEach(element => {
            if(element["count"] >= threshold) {
                // console.log(element["_id"]["url"].length);
                // console.log(element["count"]);  
                // console.log(element["_id"]["url"].hashCode());         
                dbase.createCollection(collectionName)
                .then(function(dbCollection) {
                    dbCollection.insertOne({
                       "url":element["_id"]["url"],
                       "access-count":element["count"],
                       "digest":element["_id"]["url"].hashCode()
                    });
                });
            }
        });
    });
}

function findAccessRanking(MongoClient, dbUrl, collectionName, threshold) {
    // console.log("Start Finding Duplicates...");
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
                // console.log(res);
                // DO something with the res
                updateRanking(dbase, res, "access-ranking", 5);
            });
        }).catch(function(err) {
            console.log(err);
        });
    }).catch(function(err) {
        console.log("Change DB went wrong");
    });
}
function isFrequentlyAccessedSite(MongoClient, dbUrl, collectionName, msg, websocket) {
    MongoClient.connect(dbUrl)
    .then(function(db) {
        let dbase = db.db("YPTN-Client");
        dbase.createCollection(collectionName)
        .then(function(dbCollection) {
            dbCollection.findOne({"url":msg["url"]}, (err, res) => {
                if(err) {console.log(err);}
                else {
                    if(!res) {
                        console.log("Not frequently accessed");
                        websocket.send("false");
                    }
                    else {
                        console.log("Find frequently accesses site: ", res);
                        websocket.send("true");
                    }
                }
            });

        });
    });
}

function saveNewCacheIntoDB(MongoClient, dbUrl, collectionName, cacheData) {
    MongoClient.connect(dbUrl)
        .then(function(db) {
            let dbase = db.db("YPTN-Client");
            console.log("DB Connected");
            dbase.createCollection(collectionName)
                .then(function (dbCollection) {
                    dbCollection.findOne({"digest":cacheData.digest}, (err, result) => {
                        console.log(result);
                        if(result === null) {
                            dbCollection.insertOne(cacheData, (err, res) => {
                                console.log(err);
                            });
                        }
                        else {
                            console.log("Has been cached at ")
                        }
                    });
                });
        });
}

function loadCacheFromDB(MongoClient, dbUrl, collectionName) {

}

wss.on('connection', function (ws) {
    console.log("Client Connected");
    ws.on('message', function(msg) {
        try
        {
            msg = JSON.parse(msg);
        }
        catch (e) {
            console.log("A non-json file has been received");
        }

        console.log(msg);
        console.log(msg.identity);

        if(msg.identity === "requestDetails") {
            // console.log(msg);
            // console.log(requestDetails.url);
            writeDataintoDB(MongoClient, dbUrl, msg, collectionName="access-sites");
            isFrequentlyAccessedSite(MongoClient, dbUrl,collectionName="access-ranking",msg, ws);
            //console.log(msg);
            requestCache = msg;
        }
        else if(msg.identity === "requestHeaders") {
            // console.log(msg["User-Agent"]);
            writeDataintoDB(MongoClient, dbUrl, {"User-Agent": msg["User-Agent"]}, collectionName="user-history");
            findAccessRanking(MongoClient, dbUrl, collectionName="access-sites"), threshold=5;
            // console.log("requestCache is ", requestCache);
            writeDataintoDB(MongoClient, dbUrl, msg, collectionName = "testUserAgent");
            
        }

        else if(msg.identity === "mhtmlData") {
            console.log("Start caching site");
            // Create a Blob Convertion
            let buffer = Buffer.from()
            let storedData = {
                "cache" : new Blob(msg.cache),
                "digest" : msg.digest,
                "identity" : msg.identity,
                "timeStamp" : msg.timeStamp,

            };
            saveNewCacheIntoDB(MongoClient, dbUrl, collectionName="mhtml-cache", storedData)
        }
    });
});