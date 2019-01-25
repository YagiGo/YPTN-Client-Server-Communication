// Get the page render and saved as HTML
// Need execution from the JS environment

//let exec = require("child_process").exec
// exec("ls", (error, stdOut, stdErr) => {
//     if(stdErr) {
//         console.error(stdErr)
//     }
//     console.log(stdOut)
// });
// Get a website's url with puppeteer
let dbUrl = "mongodb://192.168.96.208:27017";
const puppeteer = require('puppeteer'); // Headless chromium browser
const fs = require("fs-extra"); // fs that supports Promise
const path = require("path"); // path related
const {URL} = require("url"); // URL parse
let JSSoup = require("jssoup").default; // Beautiful Soup, JS version
// let DBInteract = require("./server"); // DB related Interactions
let md5 = require("js-md5"); // MD5 for digest
const INIT_UPDATEGAP = 1800000; // Initial update gap
const MAX_TOLERABLE_UNMODIFIED_TIMES = 3; // Times the server allows before increasing update gap
const MIN_TOLERABLE_UPDATE_GAP = 225000; // 最短更新间隔 225秒
const MAX_TOLERABLE_UPDATE_GAP = 86400000; // 最长更新间隔 24小时
let MongoClient = require("mongodb").MongoClient;

/*=================DB ACCESS======================*/
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

async function checkDigestInDB(MongoClient, dbURL, dbName, collectionName) {

}

async function modifyDependency(filePath, tagNames) {
    fs.readFile(filePath, "utf-8")
        .then((data) => {
            // if(err) console.error(err);
            let soup = new JSSoup(data);
            let srcDependency = {};
            for (let tagName in tagNames) {
                let tags = soup.findAll(tagNames[tagName]);
                tags.forEach(item => {
                    if (item.attrs['src'] !== undefined) {
                        // console.log(item.attrs['src']);
                        try {
                            let path = new URL(item.attrs['src']); // Need to be converted to local dependency
                            srcDependency[item.attrs['src']] = path.pathname.substr(1);
                            // item = path.hostname
                        } catch (e) {
                            // let path = item.attrs['src']; // Probably local dependency here.
                            // console.log(path);
                            // console.log(path);
                            // No need to change the dependency
                        }
                    }
                });
            }
            //console.log(srcDependency);
            return new Promise(resolve => {
                resolve(srcDependency);
            })

        })
        .then(srcDependency => {
            // Now let's modify the original file
            // console.log(srcDependency);
            fs.readFile(filePath, "utf-8")
                .then(data => {
                    // replace all the dependencies into the local ones
                    for (let key in srcDependency) {
                        // Use regular expression to replace all
                        // let regExp = new RegExp(key, "g");
                        // console.log(key, srcDependency[key]);
                        // console.log(regExp);
                        data = data.replace(key, srcDependency[key]);
                    }
                    // console.log(data);
                    return new Promise(((resolve, reject) => {
                        resolve(data);
                        reject("replace failed");
                    }))
                })
                .then(data => {
                    // Lastly, write the modified files back
                    fs.writeFile(filePath, data)
                        .then(err => {
                            if (err) {
                                console.error("ERROR: Recreating file failed");
                            }
                            console.log("INFO: Recreating file succeeded");
                        })
                }).catch(e => {
                console.error("ERROR:", e);
            });
            // console.log(srcDependency);
        });
    /*
    fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
            console.error(err);
        }
        // console.log(data);
        let soup = new JSSoup(data);
        let tags = soup.findAll(tagName);
        let srcDependency = {};
        tags.forEach(item => {
            if (item.attrs['src'] !== undefined) {
                // console.log(item.attrs['src'])
                try {
                    let path = new URL(item.attrs['src']); // Need to be converted to local dependency
                    srcDependency[item.attrs['src']] = path.pathname;
                    // item = path.hostname
                } catch (e) {
                    // let path = item.attrs['src']; // Probably local dependency here.
                    // console.log(path);
                    // console.log(path);
                    // No need to change the dependency
                }
            }
        });
        console.log(srcDependency);
        return srcDependency;
    });
    */


    //console.log(soup.findAll('script').forEach(item => {console.log(item.attrs)}))

    // console.log(tag);
    // console.log(tag.attrs)

}

async function isCacheModified(urlToFetch, testDigestOutputPath) {
    const url = new URL(urlToFetch);
    const indexPath = `./output/${url.hostname}/index.html`;
    // const updateFrequencyAnalysisPath = path.resolve(`./updateFrequencyAnalysis/${url.hostname}.csv`);
    // console.log("INFO FROM MODIFIED:", indexPath);
    // write header info to the analysis csv file
    // fs.writeFile(updateFrequencyAnalysisPath, "URL,Files,Modified Files,Unmodified Files");
    await update(urlToFetch, testDigestOutputPath);
    fs.readFile(indexPath, "utf-8", (err, data) => {
        if(err) console.error("ERROR:", err);
        // console.log(md5(data));
        });
}

async function update(urlToFetch, testDigestOutputPath) {
    /* 1 */
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = new URL(urlToFetch);
    // Some paths
    const rootCachePath = `./output/${url.hostname}`;
    const indexPath = rootCachePath + '/index.html';
    const digestPath = path.resolve(`${rootCachePath}/digest.json`);
    const updateFrequencyAnalysisPath = path.resolve(`./updateFrequencyAnalysis/${url.hostname}.csv`);
    // Timestamp and path
    let current = new Date();
    let currentTime = Math.floor(current.getTime() / 1000);
    const fileNameLogDir = path.resolve(`./filePathCheck/${url.hostname}`); // Create the file name path to chekc file name changes
    if(!fs.existsSync(fileNameLogDir)) {fs.mkdirSync(fileNameLogDir);} // Create file name path sync
    // create the file name changes log file(txt)
    // const fileNameLogPath = path.resolve(`${fileNameLogDir}/${url.hostname}_${currentTime}.json`);
    // console.log("INFO: File name log path:", fileNameLogPath);

    // const digestTestPath = path.resolve(`./digest/${url.hostname}.json`);
    let fileDigest = {}; // Record digest of every file sent from web servers
    let fileNameDigest = {}; // Requested name changes and digest changes, FOR TEST PURPOSE
    let fileCounter = 0, modifiedCounter = 0, unmodifiedCounter = 0;

    /* 2 */
    // page.on('request', async (request) => {
    //     console.log(request.headers());
    // });

    await page.on('response', async (response) => {

        // console.log(url);
        try {
            const requestedPath = new URL(response.url());
            let filePath = path.resolve(`./output/${url.hostname}${requestedPath.pathname}`);
            // let digestPath = path.resolve(`./output/${url.hostname}/digest.json`);
            let fileStructure = md5(await response.buffer());
            if (path.extname(requestedPath.pathname).trim() === '') {
                filePath = `${filePath}/index.html`;
            }

            // 每个文件里面都加上详细信息， 包括但不限于URL，更新间隔, 未更新次数, 上次更新后经过的时间
            let fileInfo = {
                "_id": fileStructure,
                "URL": response.url(),
                "updateGap": INIT_UPDATEGAP, // Init updateGap
                "unmodifiedTimes": 0,
                "newlyAdded": 1,
                "timeSinceLastUpdated": 0,
                "savedPath": filePath
            };
            await fs.outputFile(filePath, await response.buffer());
            // console.log(fileCounter, modifiedCounter, unmodifiedCounter);
            writeDigestintoDB(MongoClient, dbUrl, "YPTN-Server", url.hostname, fileInfo);

        }
        catch(err) {

            // console.error(err);
            // console.warn("WARN: redirect responses occurred, could not be cached");
        }
    });

    /* 3 */
    await page.goto(urlToFetch, {
        waitUntil: 'networkidle2'
    })
        .then(response => {
            // console.log(urlToFetch, "caching process finished with code", response.status());
            let rootPath = path.resolve(`./output/${url.hostname}`);
            // let indexPath = path.resolve(`${rootPath}/index.html`);
        });
    // Modify dependency here
    await modifyDependency(indexPath, ["script", "img"]);
    setTimeout(async () => {
        await browser.close();
    }, 2000 * 3);
    console.log("INFO:", await page.title());
    // console.log("INFO:", await page.title());
    /* 4 */
    // Change the src

    // const scripts = await page.$("h2.Companybox__title", scripts => {return scripts});
    // const imgs = await page.$("img", imgs => {return imgs.length;});

    // console.log(scripts, imgs);
    // const scriptSrc = await page.$$eval("script", script => {return script;});
    // console.log(scriptSrc);




}

// TODO need a function to update files periodically
async function updateFilePeriodically(urlToFetch) {
    // urlToFetch: url currently accessing
    // get the digest json file based on the urlToFetch
    let url = new URL(urlToFetch);
    let digestPath = path.resolve(`./digest/${url.hostname}.json`);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let timeSinceLastExecuted = 0; // 计数一共运行了多少秒，如果到了86400则清0
    fs.readFile(digestPath)
        .then(binData => {
            let data = JSON.parse(binData);
            for(let requestedFileDigest in data) {
                let fileInfo = data[requestedFileDigest];
                // let updateGap = fileInfo["updateGap"] // We only need the updateGap to perform update
                console.log(fileInfo);
                setInterval(() => {
                    let filePath = fileInfo["savedPath"];

                }, 225000)
            }
        })
        .catch(err => {
            console.error(err);
        })

}

function evaluate(startTimestamp, endTimestamp) {
    let current = new Date();
    let currentTime = Math.floor(current.getTime() / 1000);
    let startTime = new Date(startTimestamp * 1e3).toISOString().slice(-13, -5);
    let endTime = new Date(endTimestamp * 1e3).toISOString().slice(-13, -5);
    console.log("This evaluation will start at", startTime, "GMT", "and end at", endTime, "GMT");
    while (currentTime < startTimestamp) {
        current = new Date();
        currentTime = Math.floor(current.getTime() / 1000);
    }
    console.warn("Task begins, don't shut off the computer!!!");
    let index = 1;
    let taskID = setInterval(() => {
        console.log("Evaluation No.", index);
        index += 1;
        testSiteSet.forEach(urlToFetch => {
            url = new URL(urlToFetch);
            const updateFrequencyAnalysisPath = path.resolve(`./digest/${url.hostname}.json`);
            // console.log(updateFrequencyAnalysisPath);
            isCacheModified(urlToFetch, updateFrequencyAnalysisPath);
            current = new Date();
            currentTime = Math.floor(current.getTime() / 1000);
            if (currentTime > endTimestamp) {
                clearInterval(taskID);
            }
        });}, 600000);
}

module.exports = {
    update
};




/* =======================================  Test Filed  =================================================== */
// update("https://www.imdb.com");
// update("https://www.bing.com/");


const testSiteSet = [
    "https://www.google.com", // 検索サイト
    "https://www.yahoo.co.jp", // 検索サイト
    "https://www.baidu.com", // Search Engine
    "https://www.facebook.com",　// SNS
    "https://www.twitter.com", // SNS
    "https://www.youtube.com", // 動画サイト
    "https://www.wikipedia.org", // 一般的なテクストの多いサイト
    "https://www.taobao.com", 　// ショッピングサイト
    "https://www.amazon.com",　// ショッピングサイト
    "https://www.reddit.com",　//　一般的なサイト
    "https://news.yahoo.com",　//　一般的なサイト
    "https://www.softlab.cs.tsukuba.ac.jp", //アクセス数は相対的に少ないサイト
    "https://www.zhaoxinblog.com/",　//アクセス数は相対的に少ないサイト
    "https://www.bbc.com", // News Site
    "https://www.cnn.com", // News Site
    "https://news.yahoo.co.jp" // News Site
];

const testSiteSet2 = [
    "https://www.softlab.cs.tsukuba.ac.jp", //アクセス数は相対的に少ないサイト
    "https://www.zhaoxinblog.com/",　//アクセス数は相対的に少ないサイト
];

// update check function test
testSiteSet2.forEach(urlToFetch => {
    console.log("Start analyzing", urlToFetch);
    url = new URL(urlToFetch);
    const updateFrequencyAnalysisPath = path.resolve(`./digest/${url.hostname}.json`);
    console.log(updateFrequencyAnalysisPath);
    isCacheModified(urlToFetch, updateFrequencyAnalysisPath);
});

// evaluate(startTimestamp=1547110800, endTimestamp=1547154000);
// updateFilePeriodically("https://www.softlab.cs.tsukuba.ac.jp");

// update function check
// testSiteSet.forEach(urlToFetch => {
//     url = new URL(urlToFetch);
//     updateFilePeriodically(urlToFetch)
// });
