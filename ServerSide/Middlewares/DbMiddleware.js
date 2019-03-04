/********************Constants**********************/
const config = require("../config");
const md5 = require("js-md5"); // MD5 for digest
const INIT_UPDATEGAP = config.config["development"]["updateVariables"]["INIT_UPDATEGAP"]; // Initial update gap
const MAX_TOLERABLE_UNMODIFIED_TIMES = config.config["development"]["updateVariables"]["MAX_TOLERABLE_UNMODIFIED_TIMES"];; // Times the server allows before increasing update gap
const MIN_TOLERABLE_UPDATE_GAP = config.config["development"]["updateVariables"]["MIN_TOLERABLE_UPDATE_GAP"]; // 最短更新间隔 225秒
const MAX_TOLERABLE_UPDATE_GAP = config.config["development"]["updateVariables"]["MAX_TOLERABLE_UPDATE_GAP"]; // 最长更新间隔 24小时
const fs = require("fs-extra"); // fs that supports Promise
const path = require("path"); // path related

/****************DB Middleware *******************/
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
                    //TODO Add one for URL-HASH map
                    else if(collectionName === "url-hash-map") {
                        dbCollection.find({"hashValue": dataObject["hashValue"]}).toArray((err, result)=>{
                            if(err) throw(err);
                            if(result.length === 0) {
                                // Not stored before
                                dbCollection.insertOne(dataObject, (err, res)=>{if(err) console.error(err)})
                            }
                        })

                    }
                }).catch(function(err) {
                console.log(err);
            });
        }).catch(function(err) {
        console.log("Change DB went wrong: ", err);
    });
}

function saveNewCacheIntoDB(MongoClient, dbUrl, collectionName, cacheData) {
    MongoClient.connect(dbUrl)
        .then(function(db) {
            let dbase = db.db("YPTN-Client");
            // console.log("DB Connected");
            dbase.createCollection(collectionName)
                .then(function (dbCollection) {
                    dbCollection.findOne({"url-digest":cacheData["url-digest"]}, (err, result) => {
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
                            // console.log("INFO: Query result", result);
                            if(result === null) {
                                websocket.emit("CacheExistenceCheck", "uncached");
                            }
                            else {
                                websocket.emit("CacheExistenceCheck", "cached");
                                // websocket.emit("SendCache", result);
                                // createCacheRequest(result, websocket);
                                sendCacheURLBack(md5(requestDetails.url), websocket);

                            }
                        });
                    });
            });
    })
}

function hasSearchResultinDB(MongoClient, dbUrl, dbName, collectionName, query)
{
    return new Promise((resolve, reject) => {
        MongoClient.connect(dbUrl)
            .then((db) => {
                let dbase = db.db(dbName);
                dbase.createCollection(collectionName)
                    .then(dbCollection => {
                        dbCollection.find(query).toArray((err, result)=>{
                            if(err) reject(err);
                            if(result.length === 0) resolve(false);
                            else resolve(true);
                        })
                    })
            })
    });
}

async function modifyDigestintoDB(MongoClient, dbURL, dbName, collectionName, fileInfo) {
    MongoClient.connect(dbURL)
        .then((db) => {
            let dbase = db.db(dbName);
            dbase.createCollection(collectionName)
                .then(collection => {
                    try
                    {
                        collection.find({"_id": fileInfo["_id"]}).toArray(function(err, result) {
                            if(result.length === 0) {
                                collection.find({"URL": fileInfo["URL"]}).toArray(function(err, result) {
                                    if(err) throw err;
                                    if(result.length === 0) {
                                        // 没有找到对应的MD5和URL的文件，表明此文件可能是新加的
                                        collection.insertOne(fileInfo, (err) => {if(err) throw err;})
                                    }
                                    else{
                                        for(let index in result) {
                                            // MD5值变了但是URL不变，表示源文件发生了变化
                                            let savedFileInfo = result[index];
                                            let updateValues = {
                                                $set: {
                                                    updateGap: savedFileInfo["updateGap"] < MIN_TOLERABLE_UPDATE_GAP?
                                                        MIN_TOLERABLE_UPDATE_GAP : Math.round(savedFileInfo["updateGap"] / 2),
                                                    unmodifiedTimes: 0,
                                                    newlyAdded: 0,
                                                    timeSinceLastUpdated: 0,
                                                    savedPath: fileInfo["savedPath"]
                                                }
                                            };
                                            collection.updateOne({"URL": fileInfo["URL"]}, updateValues, (err) => {if(err) throw err;})
                                        }
                                    }
                                });
                            }
                            else{
                                // MD5值没变，源文件没有发生变化
                                for(let index in result) {
                                    let savedFileInfo = result[index];
                                    // console.log(savedFileInfo["updateGap"], savedFileInfo["unmodifiedTimes"]);

                                    if (savedFileInfo["updateGap"] < MAX_TOLERABLE_UPDATE_GAP && savedFileInfo["unmodifiedTimes"] < MAX_TOLERABLE_UNMODIFIED_TIMES) {
                                        let updateValues = {
                                            $set: {
                                                URL: fileInfo["URL"],
                                                updateGap: savedFileInfo["updateGap"],
                                                unmodifiedTimes: savedFileInfo["unmodifiedTimes"] + 1,
                                                newlyAdded: 0,
                                                timeSinceLastUpdated: savedFileInfo["timeSinceLastUpdated"] + savedFileInfo["updateGap"],
                                                savedPath: fileInfo["savedPath"]
                                            }
                                        };
                                        collection.updateOne({"_id": fileInfo["_id"]}, updateValues, (err)=>{if(err) throw err;})
                                    }

                                    else if (savedFileInfo["unmodifiedTimes"] >= MAX_TOLERABLE_UNMODIFIED_TIMES) {
                                        let updateValues = {
                                            $set: {
                                                URL: fileInfo["URL"],
                                                updateGap:  savedFileInfo["updateGap"] * 2,
                                                unmodifiedTimes: 0,
                                                newlyAdded: 0,
                                                timeSinceLastUpdated: savedFileInfo["timeSinceLastUpdated"] + savedFileInfo["updateGap"],
                                                savedPath: fileInfo["savedPath"]
                                            }
                                        };
                                        collection.updateOne({"_id": fileInfo["_id"]}, updateValues, (err)=>{if(err) throw err;})
                                    }

                                    else if (savedFileInfo["updateGap"] >= MAX_TOLERABLE_UPDATE_GAP) {
                                        let updateValues = {
                                            $set: {
                                                URL: fileInfo["URL"],
                                                updateGap:  MAX_TOLERABLE_UPDATE_GAP,
                                                unmodifiedTimes: 0,
                                                newlyAdded: 0,
                                                timeSinceLastUpdated: savedFileInfo["timeSinceLastUpdated"] + savedFileInfo["updateGap"],
                                                savedPath: fileInfo["savedPath"]
                                            }
                                        }
                                        collection.updateOne({"_id": fileInfo["_id"]}, updateValues, (err)=>{if(err) throw err;})
                                    }

                                }
                            }
                        })
                    }
                    catch(err) {
                        console.error(err);
                    }
                })
                .catch(err => {
                    if(err) {console.warn("Collection has been created, jumping to the collection")}
                })
        })
}

module.exports = {
    writeDataintoDB,
    saveNewCacheIntoDB,
    loadCacheFromDB,
    hasSearchResultinDB,
    modifyDigestintoDB,
}