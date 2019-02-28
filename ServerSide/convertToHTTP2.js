// Set up HTTP/2 connection between client and edge server
const config = require("./config");
const fs = require('fs'); // For cert
const DBMiddleware = require("./Middlewares/DbMiddleware.js"); // Database middleware
const path = require('path');
// eslint-disable-next-line
const http2 = require('http2');
const helper = require('./pushFileHelper'); // help add header to file
const { HTTP2_HEADER_PATH } = http2.constants;
const PORT = 3000;
const PUBLIC_PATH = path.join(__dirname, '../testSite');

const publicFiles = helper.getFiles(PUBLIC_PATH);
const server = http2.createSecureServer({
    cert: fs.readFileSync(path.join(__dirname, '../testSSL/server.crt')),
    key: fs.readFileSync(path.join(__dirname, '../testSSL/server.key'))
}, onRequest);
const serverSideDB = config.config["development"]["DB"]["serverSideDB"];
const clientSideDB = config.config["development"]["DB"]["clientSideDB"];
const cacheInfo = "cache-info";
const MongoClient = require("mongodb").MongoClient();
const dbURL = config.DBUrl();

// Push file
function push (stream, path) {
    const file = publicFiles.get(path);
    console.log(file);

    if (!file) {
        return
    }

    stream.pushStream({ [HTTP2_HEADER_PATH]: path }, (pushStream) => {
        pushStream.respondWithFD(file.fileDescriptor, file.headers)
    })
}

// Request handler
function onRequest (req, res) {
    const reqPath = req.url === '/' ? '/index.html' : req.url;
    const file = publicFiles.get(reqPath);
    console.log(reqPath);

    // File not found
    if (!file) {
        res.statusCode = 404;
        res.end();
        return
    }

    // Push with index.html
    if (reqPath === '/index.html') {
        push(res.stream, '/index.js');
        push(res.stream, '/index.css');
    }

    // Serve file
    res.stream.respondWithFD(file.fileDescriptor, file.headers)
}

server.listen(PORT, (err) => {
    if (err) {
        console.error(err);
        return
    }

    console.log(`Server listening on ${PORT}`)
});