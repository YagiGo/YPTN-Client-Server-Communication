const fs = require("fs");

function readMHTML() {

}

exports.loadCacheFromDB = function loadCacheFromDB(MongoClient, dbUrl, collectionName, requestDetails, websocket) {
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
                            websocket.emit("SendCache", result);
                        }
                    });
                });
        });
};



