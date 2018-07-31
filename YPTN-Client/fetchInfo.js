/**
 * Created by zhaoxin on 18/07/26.
 */
let tabCounter = 0; // Tab counter
let previousRequestID = ''; //This is used to record previous request ID for same request

function callback(requestDetails) {
	// For test purpose
	console.log("Console Log: ",requestDetails);
}

function changeMainFrame(requestDetails) {
	// The User have left the current site
	console.log("The User have changed the domain: ", requestDetails);
}

function changeSubFrame(requestDetails) {
	// The user is still under the same page but in a different page
	console.log("The user went to a different page under the same domain: ", requestDetails);
}

function openNeWTab(requestDetails) {
	// Do something when user open a new tab
	if(requestDetails.url === "https://www.google.co.jp/_/chrome/newtab?ie=UTF-8") {
		tabCounter += 1;
		console.log("The user has opened a new tab\n current tab count:", tabCounter);
	}
}

function pageChange(requestDetails) {

	if(requestDetails.url === "https://www.google.co.jp/_/chrome/newtab?ie=UTF-8") {
		tabCounter += 1;
		console.log("The user has opened a new tab\n current tab count:", tabCounter);
	}

	else if(previousRequestID !== requestDetails.requestId || previousRequestID === '' ) {
		// A new event was recorded
		previousRequestID = requestDetails.requestId;
		console.log("New event: ", requestDetails);
	}

	else if(previousRequestID === requestDetails.requestId) {
		// One event has multiple request
		console.log("Same Event: ", requestDetails);
	}

	else {
		previousRequestID = requestDetails.requestId;
		console.log("Other Situation: ", requestDetails);
	}
}

function sendData(domain, port) {
	let socket = io.connect('http://' + domain + ":" + port);
	socket.on('connect', function (requuestDetails) {
		socket.emit('my event', requuestDetails);
    })
}

/*
function distinguishHeaderByID(requestDetails) {
    for(let i = 0; i <requestDetails.length; i++)
}
*/
// add the listener,
// passing the filter argument and "blocking"
// browser.webRequest.onBeforeRequest.addListener(
chrome.webRequest.onBeforeRequest.addListener(
	pageChange,
	{urls: ["<all_urls>"], types: ["main_frame"]},
	["blocking"]
);

chrome.webRequest.onBeforeRequest.addListener(
	callback,
	{urls: ["<all_urls>"]},
	["blocking"]

);
/*
chrome.webRequest.onBeforeRequest.addListener(
	openNeWTab,
	{urls: ["<all_urls>"], types: ['main_frame']},
	['blocking']
);
*/

/*
chrome.webRequest.onBeforeSendHeaders.addListener(
    callback,
    {urls: ["<all_urls>"], types: ["main_frame"]},
    ["blocking"]
);
*/