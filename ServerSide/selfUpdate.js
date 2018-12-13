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
const fs = require("fs-extra");
const path = require("path");
const {URL} = require("url");
let JSSoup = require("jssoup").default;

async function modifyDependency(filePath, tagName) {
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
}

async function update(urlToFetch) {
    /* 1 */
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = new URL(urlToFetch);
    const rootCachePath = `./output/${url.hostname}`;
    const indexPath = rootCachePath + '/index.html';

    /* 2 */
    // page.on('request', async (request) => {
    //     console.log(request.headers());
    // });

    page.on('response', async (response) => {

        // console.log(url);
        try {
            const requestedPath = new URL(response.url());
            let filePath = path.resolve(`./output/${url.hostname}${requestedPath.pathname}`);
            // console.log(requestedPath.pathname);
            // console.log(path.extname(requestedPath.pathname));
            if (path.extname(requestedPath.pathname).trim() === '') {
                filePath = `${filePath}/index.html`;
            }
            // Modify all the depended path to the local ones
            await fs.outputFile(filePath, await response.buffer());
        }
        catch(err) {
            console.warn("WARN: redirect responses occurred, could not be cached");
        }
    });

    /* 3 */
    await page.goto(urlToFetch, {
        waitUntil: 'networkidle2'
    })
        .then(response => {
            console.log(urlToFetch, "caching process finished with code", response.status());
            let indexPath = path.resolve(`./output/${url.hostname}/index.html`);
            // Now modify the dependencies in the index HTML
            console.log(indexPath);

        });
    // console.log("INFO:", await page.title());
    /* 4 */
    // Change the src

    // const scripts = await page.$("h2.Companybox__title", scripts => {return scripts});
    // const imgs = await page.$("img", imgs => {return imgs.length;});

    // console.log(scripts, imgs);
    // const scriptSrc = await page.$$eval("script", script => {return script;});
    // console.log(scriptSrc);

    setTimeout(async () => {
        await browser.close();
    }, 2000 * 4);

    const scriptSrcs = await modifyDependency(indexPath, "script");
    const imgSrcs = await modifyDependency(indexPath, "img");
    console.log(scriptSrcs, imgSrcs);

}

module.exports = {
    update
};



update("https://www.google.com");
