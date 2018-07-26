/**
 * Created by zhaoxin on 18/07/26.
 */
function callback(requestDetails) {
	console.log(requestDetails);
}

// add the listener,
// passing the filter argument and "blocking"
// browser.webRequest.onBeforeRequest.addListener(
chrome.webRequest.onBeforeRequest.addListener(
	callback,
	{urls: ["<all_urls>"]},
	["blocking"]
);