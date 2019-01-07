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

async function isCacheModified(urlToFetch) {
    const url = new URL(urlToFetch);
    const indexPath = `./output/${url.hostname}/index.html`;
    const updateFrequencyAnalysisPath = path.resolve(`./updateFrequencyAnalysis/${url.hostname}.csv`);
    // console.log("INFO FROM MODIFIED:", indexPath);
    // write header info to the analysis csv file
    // fs.writeFile(updateFrequencyAnalysisPath, "URL,Files,Modified Files,Unmodified Files");
    await update(urlToFetch);
    fs.readFile(indexPath, "utf-8", (err, data) => {
        if(err) console.error("ERROR:", err);
        // console.log(md5(data));
        });
}

async function update(urlToFetch) {
    /* 1 */
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = new URL(urlToFetch);
    // Some paths
    const rootCachePath = `./output/${url.hostname}`;
    const indexPath = rootCachePath + '/index.html';
    const digestPath = path.resolve(`${rootCachePath}/digest.json`);
    const updateFrequencyAnalysisPath = path.resolve(`./updateFrequencyAnalysis/${url.hostname}.csv`);
    // Some constants here
    const INIT_UPDATEGAP = 1800000; // Initial update gap
    const MAX_TOLERABLE_UNMODIFIED_TIMES = 3; // Times the server allows before increasing update gap
    const MIN_TOLERABLE_UPDATE_GAP = 225000; // 最短更新间隔 225秒
    const MAX_TOLERABLE_UPDATE_GAP = 86400000; // 最长更新间隔 24小时
    const digestTestPath = path.resolve(`./digest/${url.hostname}.json`);

    let fileDigest = {}; // Record digest of every file sent from web servers
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
            let fileStructure = `${url.hostname}${requestedPath.pathname}`;
            let previousDigest = {};
            try {
                previousDigest = JSON.parse(await fs.readFile(digestTestPath, "utf-8"));
            } catch(e) {
                console.warn("WARN: A new site was requested, no digest at this time");
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
            let newHashValue = md5(await response.buffer());

            // 每个文件里面都加上详细信息， 包括但不限于摘要，更新间隔, 未更新次数
            let fileInfo = {
                "digest": "",
                "updateGap": previousDigest[fileStructure]===undefined? INIT_UPDATEGAP : previousDigest[fileStructure]["updateGap"], // Init updateGap
                "unmodifiedTimes": 0
            };
            fileInfo["digest"] =  md5(await response.buffer());
            fileDigest[fileStructure] = fileInfo;

            if(previousDigest[fileStructure] === undefined) {} // What if undefined?


            else if(previousDigest[fileStructure]["digest"] === md5(await response.buffer())) {
                // console.log("INFO: file remained the same as previous cached");
                // console.log("Previous:",previousDigest[filePath], "This time:",newHashValue);
                fileCounter += 1;
                unmodifiedCounter += 1;
                if(previousDigest[fileStructure] === undefined) {}
                else if(previousDigest[fileStructure]["unmodifiedTimes"] === MAX_TOLERABLE_UNMODIFIED_TIMES) {
                    // Reach the threshold, extend update gap and reset counter
                    // TODO More through in the future
                    console.log(previousDigest[fileStructure]["updateGap"]);

                    // Do not excced max tolerable update gap
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
                // console.log("INFO: file was modified since previous cached");
                // console.log("Previous:",previousDigest[filePath], "This time:",newHashValue);
                fileCounter += 1;
                modifiedCounter += 1;
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

            // console.log(fileDigest[fileStructure])
            await fs.outputFile(filePath, await response.buffer());
            // console.log(fileCounter, modifiedCounter, unmodifiedCounter);

        }
        catch(err) {

            // TODO Cancel comment
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

            // Write the digest into the digest folder for test purpose
            // WILL BE DELETED
            fs.writeFile(digestTestPath, JSON.stringify(fileDigest));


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

module.exports = {
    update
};



// update("https://www.imdb.com");



// update("https://www.bing.com/");

let testSiteSet = [
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
    "https://www.zhaoxinblog.com/"　//アクセス数は相対的に少ないサイト
];

let testSetMin = [
    "https://www.softlab.cs.tsukuba.ac.jp"
]
testSiteSet.forEach(url => {
    console.log("Start analyzing", url);
    isCacheModified(url);
});


