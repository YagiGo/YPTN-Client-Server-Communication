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
            let digestPath = path.resolve(`./output/${url.hostname}/digest.json`);
            // let fileStructure = `${url.hostname}${requestedPath.pathname}`;
            // let fileStructure = response.url();
            let fileStructure = md5(await response.buffer());
            let previousDigest = {};
            try {
                previousDigest = JSON.parse(await fs.readFile(testDigestOutputPath, "utf-8"));
            } catch(e) {
                // console.warn("WARN: A new site was requested, no digest at this time");
            }
            // console.log(filePath);
            //Read the previous Digest

            // console.log(requestedPath.pathname);
            // console.log(path.extname(requestedPath.pathname));
            if (path.extname(requestedPath.pathname).trim() === '') {
                filePath = `${filePath}/index.html`;
            }
            // Modify all the depended path to the local ones
            // Now I need a JSON file to track the digest of requested file
            // let newHashValue = md5(await response.buffer());

            // Add info to fileNameLog json file
            // fileNameDigest[fileStructure] =
            //     {
            //         "URL": response.url(),
            //         "newlyAdded": 1
            //     };

            // 每个文件里面都加上详细信息， 包括但不限于URL，更新间隔, 未更新次数, 上次更新后经过的时间
            let fileInfo = {
                "URL": "",
                "updateGap": previousDigest[fileStructure]===undefined? INIT_UPDATEGAP : previousDigest[fileStructure]["updateGap"], // Init updateGap
                "unmodifiedTimes": 0,
                "newlyAdded": 1,
                "timeSinceLastUpdated": 0,
                "savedPath": ""
            };
            fileInfo["URL"] =  response.url();
            fileDigest[fileStructure] = fileInfo;
            // fs.appendFile(fileNameLogPath, fileStructure + "\n");

            if(previousDigest[fileStructure] === undefined) {
                fileCounter += 1;
                modifiedCounter += 1;
                console.log("INFO: A new file URL recorded, digest:", fileStructure);
            } // What if undefined?

            else if(previousDigest[fileStructure]["URL"] === response.url()) {
                console.log("INFO: File URL remained the same as previous cached");
                // console.log("Previous:",previousDigest[filePath], "This time:",newHashValue);
                fileCounter += 1;
                unmodifiedCounter += 1;
                fileDigest[fileStructure]["newlyAdded"] = 0;
                // fileNameDigest[fileStructure]["newlyAdded"] = 0;
                if(previousDigest[fileStructure]["unmodifiedTimes"] === MAX_TOLERABLE_UNMODIFIED_TIMES) {
                    // Reach the threshold, extend update gap and reset counter
                    // TODO More through in the future
                    console.log(previousDigest[fileStructure]["updateGap"]);

                    // Do not exceed max tolerable update gap
                    previousDigest[fileStructure]["updateGap"] < MAX_TOLERABLE_UPDATE_GAP ?
                        fileDigest[fileStructure]["updateGap"] = previousDigest[fileStructure]["updateGap"] * 2:// Extend update gap
                        fileDigest[fileStructure]["updateGap"] = MAX_TOLERABLE_UPDATE_GAP;

                    fileDigest[fileStructure]["unmodifiedTimes"] = 1 // reset counter
                }
                else {
                    fileDigest[fileStructure]["unmodifiedTimes"] = previousDigest[fileStructure]["unmodifiedTimes"] + 1
                }
            }
            else {
                console.log("INFO: file URL was modified since previous cached");
                // console.log("Previous:",previousDigest[filePath], "This time:",newHashValue);
                fileCounter += 1;
                modifiedCounter += 1;
                fileDigest[fileStructure]["newlyAdded"] = 0;
                // fileNameDigest[fileStructure]["newlyAdded"] = 0;
                // shrink update gap, but do not go below the minimum tolerable update gap
                previousDigest[fileStructure]["updateGap"] <= MIN_TOLERABLE_UPDATE_GAP ?
                    fileDigest[fileStructure]["updateGap"] = MIN_TOLERABLE_UPDATE_GAP :
                    fileDigest[fileStructure]["updateGap"] = Math.round(previousDigest[fileStructure]["updateGap"] / 2);



            }
            // Data Structure for digest
            // {
            //     URL: {
            //             digest: xxxxxx,
            //             updateGap: 1800,
            //             unmodifiedTimes: 1
            //          }
            // }
            fileDigest[fileStructure]["savedPath"] = filePath;
            // console.log(fileDigest[fileStructure])
            await fs.outputFile(filePath, await response.buffer());
            // console.log(fileCounter, modifiedCounter, unmodifiedCounter);

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
            let indexPath = path.resolve(`${rootPath}/index.html`);
            // let digestPath = path.resolve(`${rootPath}/digest.json`);
            // Now modify the dependencies in the index HTML
            // console.log(indexPath);
            // console.log(fileDigest);
            // Write the file Digest into the system folder
            fs.writeFile(digestPath, JSON.stringify(fileDigest))
                .then(() => {
                    // console.log("INFO: Writing Digest to", digestPath);
                });
            // fs.writeFile(fileNameLogPath, JSON.stringify(fileNameDigest));

            // Write the digest into the digest folder for test purpose
            // WILL BE DELETED
            fs.writeFile(testDigestOutputPath, JSON.stringify(fileDigest));


            console.log("URL:", urlToFetch, "Files:", fileCounter, "Modified Files:",  modifiedCounter,"Unmodified Files:",  unmodifiedCounter);
            fs.appendFile(updateFrequencyAnalysisPath, "\n" + urlToFetch + "," + fileCounter + "," + modifiedCounter + "," + unmodifiedCounter)
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
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    let timeSinceLastUpdated = 0;
    fs.readFile(digestPath)
        .then(binData => {
            let data = JSON.parse(binData);
            for(let requestedFileDigest in data) {
                let fileInfo = data[requestedFileDigest];
                // let updateGap = fileInfo["updateGap"] // We only need the updateGap to perform update
                console.log(fileInfo)

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

// update check function test
// testSiteSet.forEach(urlToFetch => {
//     console.log("Start analyzing", urlToFetch);
//     url = new URL(urlToFetch);
//     const updateFrequencyAnalysisPath = path.resolve(`./digest/${url.hostname}.json`);
//     console.log(updateFrequencyAnalysisPath);
//     isCacheModified(urlToFetch, updateFrequencyAnalysisPath);
// });

// evaluate(startTimestamp=1547110800, endTimestamp=1547154000);
// updateFilePeriodically("https://www.softlab.cs.tsukuba.ac.jp");

// update function check
testSiteSet.forEach(urlToFetch => {
    url = new URL(urlToFetch);
    updateFilePeriodically(urlToFetch)
});
