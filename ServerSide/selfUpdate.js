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

async function modifyDependency(filePath, tagName) {
        fs.readFile(filePath, "utf-8", (err, data) => {
            if(err) {console.error(err);}
            // console.log(data);
            let soup = new JSSoup(data);
            soup.findAll(tagName, (scriptTag) => {
                console.log("Find One");
                let srcDependency = {};
                scriptTag.forEach(item => {
                    console.log(item);
                    if(item.attrs['src'] !== undefined) {
                        try{
                            let path = new URL(item.attrs['src']); // Need to be converted to local dependency
                            console.log(path.pathname);
                            srcDependency[item.attrs['src']] = path.pathname;
                            item = path.hostname
                        } catch (e) {
                            let path = item.attrs['src']; // Probably local dependency here.
                            console.log(path);
                            // No need to change the dependency
                        }
                    }
                });
                console.log(srcDependency);
                return srcDependency;
            });

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

        });
}

async function isCacheModified(urlToFetch) {
    const url = new URL(urlToFetch);
    const indexPath = `./output/${url.hostname}/index.html`;
    console.log("INFO FROM MODIFIED:", indexPath);
    await update(urlToFetch);
    /*
    fs.readFile(indexPath, "utf-8", (err, data) => {
        if(err) console.error("ERROR:", err);
        console.log(md5(data));
        });
    */
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

    await page.on('response', async (response) => {

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
    // Modify dependency here
    // await modifyDependency(indexPath, ["script", "img"]);
    setTimeout(async () => {
        await browser.close();
    }, 2000 * 3);
    console.log("INFO:", await page.title());
    /* 4 */
    // Change the src

    // const scripts = await page.$("h2.Companybox__title", scripts => {return scripts});
    // const imgs = await page.$("img", imgs => {return imgs.length;});

    // console.log(scripts, imgs);
    // const scriptSrc = await page.$$eval("script", script => {return script;});
    // console.log(scriptSrc);




}

// Check if the cache changed by checking the digest




// update("https://www.bing.com/");
isCacheModified("https://www.twitter.com/");

