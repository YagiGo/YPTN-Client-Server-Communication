/**
 * Created by zhaoxin on 18/07/26.
 */
function callback(mhtmlData) {
    console.log(mhtmlData);
}
chrome.pageCapture.saveAsMHTML(details, callback);

