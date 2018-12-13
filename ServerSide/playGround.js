// var page = require('webpage').create();
// var fs = require("fs");
// page.open('https://www.yahoo.co.jp', function(status) {
//     console.log("Status: " + status);
//     if(status === "success") {
//         page.render('example.png');
//         fs.write("test.html", page.content, "w");
//     }
//     phantom.exit();
// });
/**
 * @name get list of links
 *
 * @desc Scrapes Hacker News for links on the home page and returns the top 10
 */
const fs = require("fs-extra");
let JSSoup = require("jssoup").default;
async function modifyDependency(filePath, tagName) {
    fs.readFile(filePath, "utf-8", (err, data) => {
        if(err) {console.error(err);}
        // console.log(data);
        let soup = new JSSoup(data);
        let tags = soup.findAll(tagName);
        let srcDependency = {};
        tags.forEach(item => {
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
            console.log(srcDependency);
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

}
const rootCachePath = "./output/www.yahoo.co.jp";
console.log(rootCachePath+"/index.html");
modifyDependency(rootCachePath+"/index.html", "script")
    .then(modifiedSrcs => {
        console.log("INFO: modified srcs: ", modifiedSrcs);
    });
