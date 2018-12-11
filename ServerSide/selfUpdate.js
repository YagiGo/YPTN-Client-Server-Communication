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
const puppeteer = require('puppeteer');
const fse = require("fs-extra");
const path = require("path");
const {URL} = require("url");
let JSSoup = require("jssoup").default;

async function start(urlToFetch) {
    /* 1 */
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    /* 2 */
    // page.on('request', async (request) => {
    //     console.log(request.headers());
    // });

    page.on('response', async (response) => {
        const url = new URL(urlToFetch);
        const requestedPath = new URL(response.url());
        // console.log(url);
        let filePath = path.resolve(`./output/${url.hostname}${requestedPath.pathname}`);
        console.log(requestedPath.pathname);
        console.log(path.extname(requestedPath.pathname));
        if (path.extname(requestedPath.pathname).trim() === '') {
            filePath = `${filePath}/index.html`;
        }
        // Modify all the depended path to the local ones
        await fse.outputFile(filePath, await response.buffer());
    });

    /* 3 */
    await page.goto(urlToFetch, {
        waitUntil: 'networkidle2'
    })

    // Change the cached HTML's dependency


    /* 4 */
    setTimeout(async () => {
        await browser.close();
    }, 2000 * 4);
}
start("https://www.yahoo.co.jp")
