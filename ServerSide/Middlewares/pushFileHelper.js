// Help find related files that need to be pushed with push server and wrap them with headers
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const DbMiddleware = require('./DbMiddleware');
const MongoClient = require("mongodb").MongoClient;
const config = require("../config").config;
const DBUrl = require("../config").DBUrl();

async function getFiles (requestedURL, baseDir) {
    const files = new Map();
    let serverPushFiles = await DbMiddleware.readServerPushInfoFromDB(MongoClient, DBUrl,
        config.development.DB.serverPushDB,
        requestedURL);

    serverPushFiles.forEach(fileInfo => {
        try {
            let filePath = path.join(baseDir, fileInfo["filePath"]);
            const fileDescriptor = fs.openSync(filePath, "r");
            const stat = fs.fstatSync(fileDescriptor);
            const contentType = mime.lookup(filePath);
            files.set(`/${fileInfo["filePath"]}`, {
                fileDescriptor,
                headers: {
                    'content-length': stat.size,
                    'last-modified': stat.mtime.toUTCString(),
                    'content-type': contentType
                }
            })
        }
        catch (e) {
            //console.error(e);
            console.error("ERROR: Path error, will be ignored.");
        }
    });
    let indexPath = path.join(baseDir, "index.html");
    console.log(indexPath);
    // Add HTML file info into the server push map.
    try {
        fileDescriptor = fs.openSync(indexPath, "r");
        stat = fs.fstatSync(fileDescriptor);
        contentType = mime.lookup(indexPath);
        files.set(`/index.html`, {
            fileDescriptor,
            headers: {
                'content-length': stat.size,
                'last-modified': stat.mtime.toUTCString(),
                'content-type': contentType
            }
        });
    }
    catch (e) {
        console.error(e);
        console.error("ERROR: No index file found.");
    }

    // fs.readdirSync(baseDir).forEach((fileName) => {
    //     const filePath = path.join(baseDir, fileName);
    //     const fileDescriptor = fs.openSync(filePath, 'r');
    //     const stat = fs.fstatSync(fileDescriptor);
    //     const contentType = mime.lookup(filePath);
    //     // console.log(contentType);
    //     files.set(`/${fileName}`, {
    //         fileDescriptor,
    //         headers: {
    //             'content-length': stat.size,
    //             'last-modified': stat.mtime.toUTCString(),
    //             'content-type': contentType
    //         }
    //     })
    // });

    console.log(files);
    return files
}

module.exports = {
    getFiles
};

// getFiles("https://github.com", "/Users/mac/YPTN-Client-Server-Communication/ServerSide/output/github.com")
