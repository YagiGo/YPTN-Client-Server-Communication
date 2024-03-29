//Reconstruct the file
class logging {
    // Build a systematic logging system.
}

class connectInstance {
    constructor(mongoClient, fileSystem, crypto, socketIO) {
        this.mongoClient = mongoClient;
        this.fileSystem = fileSystem;
        this.crypto = crypto;
        this.socketIO = socketIO;
    }

}

class dbAccess {
    constructor(dbURL, port, dbName, client, collectionName) {
        this.dbURL = dbURL;
        this.dbPort = port;
        this.dbName = dbName;
        this.mongoClient = client;
        this.collectionName = collectionName
    }

    set dbCollection(collectionName) {
        this.collectionName = collectionName; // Change the collection when necessary
    }

    dbAddr() {
        return "mongo://" + this.dbURL + ":" + this.dbPort;
    }

    writeDataintoDB(dataObject) {
        this.mongoClient.connect(this.dbAddr())
            .then(function (db) {
                let dbase = db.db(this.dbName);
                dbase.createCollection(this.collectionName)
                    .then(function (dbCollection) {
                        // console.log("Collection Switched!");
                        //console.log(removeDuplicateHeaders(dbCollection, "url"));
                        dbCollection.insertOne(dataObject, function (res, err) {
                            if (this.collectionName === "access-sites") {
                                // console.log("Collection Switched!");
                                //console.log(removeDuplicateHeaders(dbCollection, "url"));
                                dbCollection.insertOne(dataObject, function (res, err) {
                                });
                            }
                            else if (this.collectionName === "user-history") {
                                dbCollection.findOne(dataObject, (err, res) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                    else if (res) {
                                        // console.log("Find duplicates: ", res);
                                    }
                                    else {
                                        dbCollection.insertOne(dataObject, (err, res) => {
                                        });
                                    }
                                });
                            }
                            else if (this.collectionName === "testUserAgent") {
                                //write the request into the db based on the user agnet
                                // console.log(dataObject);
                                dbCollection.insertOne(dataObject, (err, res) => {
                                });
                            }
                        }).catch(function (err) {
                            console.log(err);
                        });
                    }).catch(function (err) {
                    console.log("Change DB went wrong: ", err);
                });
            });
    }

    saveNewCacheIntoDB(cacheData) {
        this.mongoCient.connect(this.dbAddr())
            .then(function(db) {
                let dbase = db.db(this.dbName);
                console.log("DB Connected");
                dbase.createCollection(this.collectionName)
                    .then(function (dbCollection) {
                        dbCollection.findOne({"digest":cacheData.digest}, (err, result) => {
                            // console.log(result);
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

    loadCacheFromDB(MongoClient, dbUrl, collectionName, requestDetails, websocket) {
        return new Promise(resolve => {
            MongoClient.connect(dbUrl)
                .then(function (db) {
                    let dbase = db.db("YPTN-Client");
                    dbase.createCollection(collectionName)
                        .then(function(dbCollection) {
                            // console.log(requestDetails.url);
                            dbCollection.findOne({"url": requestDetails.url}, (err, result) => {
                                // console.log(result);
                                if(result === null) {
                                    websocket.emit("CacheExistenceCheck", "uncached");
                                }
                                else {
                                    // websocket.emit("CacheExistenceCheck", "cached");
                                    // websocket.emit("SendCache", result);
                                    createCacheRequest(result, websocket)
                                }
                            });
                        });
                });
        })
    }

}

class webSocketAccess {
    constructor(socketIO){
        this.socketIO = socketIO;
    }
}

class HTMLConverter {
    constructor() {

    }
}

class webPageEvaluate {
    constructor(threshold) {
        this.threshold = threshold;

    }

    updateRanking(dbase,accessArray,collectionName) {
        dbase.createCollection(collectionName)
            .then(function(dbCollection){
                dbCollection.removeMany();
                accessArray.forEach(element => {
                    if(element["count"] >= this.threshold) {
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

    updateThreshold() {
        // Update threshold for different types of site.
    }

    findAccessRanking(MongoClient, dbUrl, collectionName, threshold) {
        // console.log("Start Finding Duplicates...");
        MongoClient.connect(dbUrl)
            .then(function(db) {
                let dbase = db.db("YPTN-Client");
                dbase.createCollection(collectionName)
                    .then(function(dbCollection) {
                        // console.log("Collection Switched!");
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

    isFrequentlyAccessedSite(MongoClient, dbUrl, collectionName, msg, websocket) {
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
                                    websocket.emit("AccessFrequencyCheck", "false");
                                }
                                else {
                                    // console.log("Find frequently accesses site: ", res);
                                    websocket.emit("AccessFrequencyCheck", "true");
                                }
                            }
                        });

                    });
            });
    }








}

class nodeConnetcion {

}



// A NodeJS server
let WebSocketServer = require('ws').Server;
// wss = new WebSocketServer({port:8080});
let requestCache;
let MongoClient = require("mongodb").MongoClient;
let dbUrl = "mongodb://192.168.96.208:27017"; //For test purpose only! Don't use this in the production environment!!!
const fs = require("fs");
const crypto = require("crypto"); // hashing url
const path = require("path"); // file path issue
const nStatic = require("node-static");
let fileServer = new nStatic.Server('./temp');
let md5 = require("js-md5");

//I am supposed to use emit here, but to use emit in the
//client side, the native websocket doesn't support the emit method.
//The current solution is adding an identifier to the json file
//Implement a hashCode function to generate digest

//Rewrite the websocket part with socket.io
let express = require("express");
let app = express();
let http = require("http").Server(app);
let io = require("socket.io")(http);
let update = require("./selfUpdate");
// let mhtml2html = require("mhtml2html");
// let mhtml = require("mhtml");

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
                // console.log("Collection Switched!");
                //console.log(removeDuplicateHeaders(dbCollection, "url"));
                dbCollection.insertOne(dataObject, function(res, err) {
                });
            }
            else if(collectionName === "user-history") {
                dbCollection.findOne(dataObject, (err, res) => {
                    if(err) {console.log(err);}
                    else if(res) {
                        // console.log("Find duplicates: ", res);
                        // This one have been cached before
                        if(collectionName == "cache-info") {
                            // This stores cache site info, now need to see if the cache changed or not

                        }
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
        // console.log("Collection Switched!");
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
                        console.log(msg["url"], " is not frequently accessed");
                        websocket.emit("AccessFrequencyCheck", "false");
                    }
                    else {
                        // console.log("Find frequently accesses site: ", res);
                        websocket.emit("AccessFrequencyCheck", "true");
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
            // console.log("DB Connected");
            dbase.createCollection(collectionName)
                .then(function (dbCollection) {
                    dbCollection.findOne({"digest":cacheData.digest}, (err, result) => {
                        // console.log(result);
                        if(result === null) {
                            dbCollection.insertOne(cacheData, (err, res) => {
                                console.log(err);
                            });
                        }
                        else {
                            console.log("Has been cached at ", collectionName)
                        }
                    });
                });
        });
}

function loadCacheFromDB(MongoClient, dbUrl, collectionName, requestDetails, websocket) {
    return new Promise(resolve => {
        MongoClient.connect(dbUrl)
            .then(function (db) {
                let dbase = db.db("YPTN-Client");
                dbase.createCollection(collectionName)
                    .then(function(dbCollection) {
                        // console.log(requestDetails.url);
                        dbCollection.findOne({"url": requestDetails.url}, (err, result) => {
                            // console.log(result);
                            if(result === null) {
                                websocket.emit("CacheExistenceCheck", "uncached");
                            }
                            else {
                                // websocket.emit("CacheExistenceCheck", "cached");
                                // websocket.emit("SendCache", result);
                                createCacheRequest(result, websocket)
                            }
                        });
                    });
            });
    })
}
function hashToCreateUrl(url) {
    let sha256sum = crypto.createHash('sha256'); // Use sha256 to hash the url to create a url for client to redirect

    sha256sum.write(url);
    sha256sum.end();
    return new Promise(resolve => {
        sha256sum.on("readable", () => {
            const hashedResult = sha256sum.read();
            // console.log(hashedResult.toString('hex')); // hash result here
            resolve(path.join(path.dirname("__dirname"), "/temp/", hashedResult.toString('hex')));
        } );
    });

}

function createMHTMLLFile(cacheData, path, websocket) {
    return new Promise((resolve, reject) => {
        // let html = new XMLSerializer().serializeToString(mhtml2html.convert(mhtml2html.parse(cacheData)).target);
        // let html = mhtml2html.convert(mhtml2html.parse(cacheData));
        // console.log("Converted html file:", html);
        fs.writeFile(path+'.mhtml',cacheData, (err) => {
            if(err) reject(err);
            console.log("Cache file created!");
            cacheFilePath = "http://localhost:8080/"+path+".mhtml";
            console.log("Cache file path is: ", cacheFilePath);
            sendCachePathToUser(cacheFilePath, websocket);
        })
    });
}

function sendCachePathToUser(cachePath, websocket)
{
    websocket.emit("CacheURL", cachePath);
}
function createCacheRequest(cacheDetails, websocket) {
    // process the cache data in the db for client to redirect
    // I haven't finished this part yet,
    hashToCreateUrl(cacheDetails.url)
        .then(fileName => {
            createMHTMLLFile(cacheDetails.cache, fileName, websocket)
                .then((error) => {
                    if(error) throw(error);
                    //Cache path = http://IP:port/filePath/fileName.mhtml
                })
        })
}



http.listen(8080, (req)=> {
    console.log("Start websocket server on port 8080");
    // console.log(req)
});


app.use("/temp", express.static("temp"));
/*
app.get("/", (req, res) => {

});
*/


app.get('/temp', (req, res) => {
    // console.log("Receiving request:", req.ip + req.hostname)
    // res.send("Cache works!");
    // res.sendFile("index.html");
});




io.on("connection", (ws) => {
    console.log("Client connected");
    ws.on("disconnect", () => {
        console.log("Client disconnected");
    });

    ws.on("RequestDetails", (msg) => {
        try {
            msg = JSON.parse(msg)
        }
        catch (e) {
            console.log("A non-json file has been received")
        }
        if(!msg.url.startsWith("http://localhost"))
        // prevent local cache loop
        {
            writeDataintoDB(MongoClient, dbUrl, msg, collectionName = "access-sites");
            isFrequentlyAccessedSite(MongoClient, dbUrl, collectionName = "access-ranking", msg, ws);
            loadCacheFromDB(MongoClient, dbUrl, collectionName = "mhtml-cache", msg, ws);
        }
    });

    ws.on("RequestHeader", (msg) => {
        try {
            msg = JSON.parse(msg);
        }
        catch (e) {
            console.log("A non-json file has been received")
        }
        writeDataintoDB(MongoClient, dbUrl, {"User-Agent": msg["User-Agent"]}, collectionName = "user-history");
        findAccessRanking(MongoClient, dbUrl, collectionName = "access-sites"), threshold = 5;
        // console.log("requestCache is ", requestCache);
        writeDataintoDB(MongoClient, dbUrl, msg, collectionName = "testUserAgent");
    });

    ws.on("SiteCache", (msg) => {
        try {
            msg = JSON.parse(msg);
        }
        catch (e) {
            console.log("A non-json file has been received")
        }
        console.log("Start caching site");
        let storedData = {
            "digest": msg.digest,
            "identity": msg.identity,
            "timeStamp": msg.timeStamp,
            "url": msg.url,
            "url-digest": md5(msg.url),
            "initUpdateGap": 3600000
        // Remove cache in the saved object
        };
        // update.update(msg.url);
        saveNewCacheIntoDB(MongoClient, dbUrl, collectionName = "cache-info", storedData);
    });
});

// Run the self-update
let selfUpdateTaskInit = setInterval(() => {
    console.log("This is the original cache self update task, executed every 1 hour by default");
    update.update("https://www.yahoo.co.jp");
}, 60000);


    // ws.on('message', function(msg) {
    //     try
    //     {
    //         msg = JSON.parse(msg);
    //     }
    //     catch (e) {
    //         console.log("A non-json file has been received");
    //     }

        // console.log(msg);
        // console.log(msg.identity);

    //    if(msg.identity === "requestDetails") {
    //        // console.log(msg);
    //        // console.log(requestDetails.url);
    //        writeDataintoDB(MongoClient, dbUrl, msg, collectionName="access-sites");
    //        isFrequentlyAccessedSite(MongoClient, dbUrl,collectionName="access-ranking",msg, ws);
    //        loadCacheFromDB(MongoClient, dbUrl, collectionName="mhtml-cache", msg, ws);
            //console.log(msg);
    //        requestCache = msg;
    //    }
    //    else if(msg.identity === "requestHeaders") {
            // console.log(msg["User-Agent"]);
    //         writeDataintoDB(MongoClient, dbUrl, {"User-Agent": msg["User-Agent"]}, collectionName="user-history");
    //         findAccessRanking(MongoClient, dbUrl, collectionName="access-sites"), threshold=5;
            // console.log("requestCache is ", requestCache);
    //        writeDataintoDB(MongoClient, dbUrl, msg, collectionName = "testUserAgent");

    //    }

    //    else if(msg.identity === "mhtmlData") {
    //        console.log("Start caching site");
    //        let storedData = {
    //            "cache" : msg.cache,
    //            "digest" : msg.digest,
    //            "identity" : msg.identity,
    //            "timeStamp" : msg.timeStamp,
    //            "url" : msg.url
//
    //        };
    //        saveNewCacheIntoDB(MongoClient, dbUrl, collectionName="mhtml-cache", storedData)
    //    }
    // });
// });

// wss.on('connection', function (ws) {
//     console.log("Client Connected");
//     ws.on('message', function(msg) {
//         try
//         {
//             msg = JSON.parse(msg);
//         }
//         catch (e) {
//             console.log("A non-json file has been received");
//         }
//
//         // console.log(msg);
//         // console.log(msg.identity);
//
//         if(msg.identity === "requestDetails") {
//             // console.log(msg);
//             // console.log(requestDetails.url);
//             writeDataintoDB(MongoClient, dbUrl, msg, collectionName="access-sites");
//             isFrequentlyAccessedSite(MongoClient, dbUrl,collectionName="access-ranking",msg, ws);
//             loadCacheFromDB(MongoClient, dbUrl, collectionName="mhtml-cache", msg, ws);
//             //console.log(msg);
//             requestCache = msg;
//         }
//         else if(msg.identity === "requestHeaders") {
//             // console.log(msg["User-Agent"]);
//             writeDataintoDB(MongoClient, dbUrl, {"User-Agent": msg["User-Agent"]}, collectionName="user-history");
//             findAccessRanking(MongoClient, dbUrl, collectionName="access-sites"), threshold=5;
//             // console.log("requestCache is ", requestCache);
//             writeDataintoDB(MongoClient, dbUrl, msg, collectionName = "testUserAgent");
//
//         }
//
//         else if(msg.identity === "mhtmlData") {
//             console.log("Start caching site");
//             let storedData = {
//                 "cache" : msg.cache,
//                 "digest" : msg.digest,
//                 "identity" : msg.identity,
//                 "timeStamp" : msg.timeStamp,
//                 "url" : msg.url
//
//             };
//             saveNewCacheIntoDB(MongoClient, dbUrl, collectionName="mhtml-cache", storedData)
//         }
//     });
// });
// Export some functions
module.exports = {
    writeDataintoDB,
    loadCacheFromDB
};