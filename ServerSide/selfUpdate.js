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

function modifyDependency(filePath) {
    return new Promise(resolve => {
        fs.readFile(filePath, "utf-8", (err, data) => {
            if(err) {console.error(err);}
            // console.log(data);
            let soup = new JSSoup(data);
            soup.findAll('script', (scriptTag) => {
                scriptTag.forEach(item => {
                    if(item.attrs['src'] !== undefined) {
                        try{
                            let path = new URL(item.attrs['src']); // Need to be converted to local dependency
                            console.log(path.pathname);
                            // TODO Change the dependency here
                            item = path.hostname
                        } catch (e) {
                            let path = item.attrs['src']; // Probably local dependency here.
                            console.log(path);
                            // No need to change the dependency
                        }
                    }
                })
                resolve(scriptTag);
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
    });
}

async function update(urlToFetch) {
    /* 1 */
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = new URL(urlToFetch);
    const rootCachePath = `./output/${url.hostname}`;

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
    page.goto(urlToFetch, {
        waitUntil: 'networkidle2'
    })
        .then(response => {
            console.log(urlToFetch, "caching process finished with code", response.status());
            let indexPath = path.resolve(`./output/${url.hostname}/index.html`);
            // Now modify the dependencies in the index HTML
            console.log(indexPath);
            modifyDependency(indexPath)
                .then((scriptTag) => {
                    console.log(scriptTag);
                })
        });

    /* 4 */
    setTimeout(async () => {
        await browser.close();
    }, 2000 * 4);


}

module.exports = {
    update
};

update("https://www.yahoo.co.jp");
