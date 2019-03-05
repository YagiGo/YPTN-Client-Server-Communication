// Help determine which files need to be server pushed.
const fs = require("fs-extra");
const path = require("path");
const {URL} = require("url");
const JSSoup = require("jssoup").default;
const config = require("./../config").config;
const DBUrl = require("./../config").DBUrl();
const DbMiddleware = require("./DbMiddleware");
const MongoClient = require("mongodb").MongoClient;


function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
}

async function parseHTML(rawHTML, tagNames) {
    // this function wraps html parser with async/await
    let soup = new JSSoup(rawHTML);
    let fileList = []; // final output
    console.log(tagNames)
    for(let index in tagNames) {
        let elements = soup.findAll(tagNames[index]);
        for(let index in elements) {
            let attrs = elements[index].attrs;
            if (!isEmpty(attrs)) {
                if (attrs.hasOwnProperty("rel") && attrs["rel"] === "stylesheet")
                {
                    fileList.push(attrs);
                }
                else if(!attrs.hasOwnProperty("rel")) {
                    fileList.push(attrs);
                }
            }
        }
    }
    return fileList
}

async function saveServerPushFiles(requestedURL, fileTypes) {
    // File types:
    // script : js
    // link : stylesheet
    // img : image
    // set a list to store file types

    let baseDir = config["development"]["cachePath"];
    let parsedURL = new URL(requestedURL);
    let cachePath = path.join(baseDir, parsedURL.hostname, "index.html");
    // console.log(cacheDir)
    let htmlFile = await fs.readFile(cachePath, "utf-8");
    let fileList = await parseHTML(htmlFile, fileTypes);
    // console.log(fileList)
    // Traverse JSON list to store File info
    for(let index in fileList) {
        let dataObject = {};

        let fileInfo = fileList[index];
        if(fileInfo.hasOwnProperty("href")) {
            dataObject["filePath"] = fileInfo["href"];
        }
        if(fileInfo.hasOwnProperty("src")) {
            dataObject["filePath"] = fileInfo["src"];
            //console.log(fileInfo);
        }
        if(dataObject["filePath"] !== "") {
            DbMiddleware.writeServerPushInfointoDB(MongoClient, DBUrl, dataObject,
                config.development.DB.serverPushDB,
                requestedURL);
        }
    }
}

async function saveFileDigest() {


}

async function getServerPushFiles(URL) {
    return await DbMiddleware.readServerPushInfoFromDB(MongoClient, DBUrl,
        config.development.DB.serverPushDB,
        URL)
}



        module.exports = {
            saveServerPushFiles,
            getServerPushFiles
};

saveServerPushFiles("https://github.com", ["script", "link"]);
