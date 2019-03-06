// var page = require('webpage').create();
// var fs = require("fs");
// page.open('https://www.yahoo.co.jp', function(status) {
//     console.log("Status: " + status);
//     if(status === "success") {
//         page.render('example.png');
//         fs.write("test.html", page.content, "w");
//     }
//     phantom.exit();
// });

/**
 * @name get list of links
 *
 * @desc Scrapes Hacker News for links on the home page and returns the top 10
 */
//const fs = require("fs-extra");
//let JSSoup = require("jssoup").default;
//const {URL} = require("url");
//
//async function modifyDependency(filePath, tagName) {
//    fs.readFile(filePath, "utf-8", (err, data) => {
//        if(err) {console.error(err);}
//        // console.log(data);
//        let soup = new JSSoup(data);
//        let tags = soup.findAll(tagName);
//        let srcDependency = {};
//        tags.forEach(item => {
//            if(item.attrs['src'] !== undefined) {
//                // console.log(item.attrs['src'])
//                try{
//                    let path = new URL(item.attrs['src']); // Need to be converted to local dependency
//                    srcDependency[item.attrs['src']] = path.pathname;
//                    // item = path.hostname
//                } catch (e) {
//                    // let path = item.attrs['src']; // Probably local dependency here.
//                    // console.log(path);
//                    // console.log(path);
//                    // No need to change the dependency
//                }
//            }
//        });
//            console.log(srcDependency);
//            return srcDependency;
//        });

        /*
        let scriptTag = soup.findAll('script').forEach(
            item => {
                if(item.attrs['src'] !== undefined) {
                    try{
                        let path = new URL(item.attrs['src']); // Need to be converted to local dependency
                        // console.log(path.pathname);
                        // TODO Change the dependency here
                        item = path.hostname
                    } catch (e) {
                        let path = item.attrs['src'] // Probably local dependency here.
                        // console.log(path);
                        // No need to change the dependency
                    }
                }
            }
        );
        */
        /*
        let modifyImgTag = new Promise((resolve, reject) => {
            soup.findAll('img', (imgTag) => {
                imgTag.forEach(
                        item => {
                            if(item.attrs['src'] !== undefined) {
                                try{
                                    let path = new URL(item.attrs['src']); // Need to be converted to local dependency
                                    console.log(path.pathname);
                                    // TODO Change the dependency here
                                } catch (e) {
                                    let path = item.attrs['src']; // Probably local dependency here.
                                    console.log(path);
                                    // No need to change the dependency
                                }
                            }
                        }
                    );
                console.log(imgTag);
                resolve(imgTag);
                reject("Failed");
            })
        });
        */

        // console.log(imgTag, scriptTag);
        // resolve(imgTag, scriptTag);

        //console.log(soup.findAll('script').forEach(item => {console.log(item.attrs)}))

        // console.log(tag);
        // console.log(tag.attrs)

// }
// const rootCachePath = "./output/www.imdb.com";
// console.log(rootCachePath+"/index.html");
// modifyDependency(rootCachePath+"/index.html", "script")
//     .then(modifiedSrcs => {
//         console.log("INFO: modified srcs: ", modifiedSrcs);
//     });

// let test = "123252"
// let replaceJSON = {"1":"a", "2":"b"};
//
// for(key in replaceJSON) {
//     console.log(regExp);
//     test = test.replace(regExp, replaceJSON[key]);
// }
//
// console.log(test);
/*
function replaceWithJSON(string, replaceJSON) {
    let newString = string;
    for(key in replaceJSON) {
        console.log(key, replaceJSON[key]);
        string = string.replace(key, replaceJSON[key]);
        console.log(string);
    }
    return new Promise(((resolve, reject) => {
        resolve(string);
        reject("ERROR")
    }));
}


replaceWithJSON(test, replaceJSON)
    .then(replaced => {
        console.log(replaced);
    })
    .catch(e => {
        console.log(e);
    });
*/
/*
let MongoClient = require("mongodb").MongoClient;
let dbUrl = "mongodb://192.168.96.208:27017";
async function modifyDigestintoDB(MongoClient, dbURL, dbName, collectionName, fileInfo) {
    MongoClient.connect(dbURL)
        .then((db) => {
            let dbase = db.db(dbName);
            dbase.createCollection(collectionName)
                .then(collection => {
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
                })
                .catch(err => {
                    if(err) {console.warn("Collection has been created, jumping to the collection")}
                })
        })
}

writeDigestintoDB(MongoClient, dbUrl, "eshi_analysis", "eshi_info")
*/

// let MongoClient = require("mongodb").MongoClient;
// let dbUrl = "mongodb://192.168.96.208:27017";
//
// MongoClient.connect(dbUrl)
//     .then(async db=>{
//         let dbase = db.db("YPTN-Server");
//         let collectionNames = await dbase.listCollections().toArray();
//         for(let index in collectionNames) {
//             console.log(collectionNames[index]["name"])
//         }
//     });

// console.log(__dirname)
// const config = require("./config");
// console.log(config.DBUrl())
// console.log(config.config["development"]["DB"]["Addr"])

const {URL} = require("url");
let url = "https://localhost:3000/23werw234fw";
let parsedUrl = new URL(url);
console.log(parsedUrl.hostname);