/**
 * Created by zhaoxin on 18/07/26.
 */
function callback(requestDetails) {
	console.log("Console Log: ",requestDetails);
}

// add the listener,
// passing the filter argument and "blocking"
// browser.webRequest.onBeforeRequest.addListener(
chrome.webRequest.onBeforeRequest.addListener(
	callback,
	{urls: ["<all_urls>"], types: ["main_frame"]},
	["blocking"]
);
/*
chrome.webRequest.onBeforeSendHeaders.addListener(
    callback,
    {urls: ["<all_urls>"], types: ["main_frame"]},
    ["blocking"]
);
*/