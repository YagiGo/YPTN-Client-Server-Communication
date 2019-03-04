// Help determine which files need to be server pushed.
const fs = require("fs-extra");
const path = require("path");
const {URL} = require("url");
const JSSoup = require("jssoup").default;
const config = require("./../config").config;
const DBUrl = require("./../config").DBUrl();
const DbMiddleware = require("./DbMiddleware");

function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
}

async function parseHTML(rawHTML, tagNames) {
    // this function wraps html parser with async/await
    let soup = new JSSoup(rawHTML);
    for(let tagName in tagNames) {

    }
    let elements = soup.findAll("link").concat(soup.findAll("script"));
    let fileList = []; // final output
    // console.log(elements)
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
    return fileList
}

async function saveServerPushFiles(requestedURL) {

    let baseDir = config["development"]["cachePath"];
    let parsedURL = new URL(requestedURL);
    let cachePath = path.join(baseDir, parsedURL.hostname, "index.html");
    // console.log(cacheDir)
    let htmlFile = await fs.readFile(cachePath, "utf-8");
    let fileList = await parseHTML(htmlFile);
    console.log(fileList)
}

async function saveFileDigest() {

}

async function getServerPushFiles(URL) {

}



module.exports = {
    saveServerPushFiles,
    getServerPushFiles
};

saveServerPushFiles("https://github.com")