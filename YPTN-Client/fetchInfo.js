/**
 * Created by zhaoxin on 18/07/26.
 */
let tabCounter = 0; // Tab counter
let previousRequestID = ''; //This is used to record previous request ID for same request
 //Websocket Communication
let ws = new WebSocket('ws://localhost:8080');
function callback(requestDetails) {
	// For test purpose
	console.log("Console Log: ",requestDetails);
}

/*
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
*/

function sendData(content, websocket) {
	if(websocket.readyState === 1) {
		websocket.send(content);
	}
	else if (websocket.readyState === 3) {
		console.log("WebSocket Error!");
	}
}

function jsonifyRequestDetails(requestDetails) {
	 
	let result =	{
			"frameId": requestDetails.frameId,
			"initiator": requestDetails.initiator,
			"method": requestDetails.method,
			"parentFramneId": requestDetails.parentFramneId,
			"requestId": requestDetails.requestId,
			"tabId": requestDetails.tabId,
			"timeStamp": requestDetails.timeStamp,
			"type": requestDetails.type,
			"url": requestDetails.url
		}
	return result;
}



function pageChange(requestDetails, websocket=ws) {

	if(requestDetails.url === "https://www.google.co.jp/_/chrome/newtab?ie=UTF-8") {
		tabCounter += 1;
		console.log("The user has opened a new tab\n current tab count:", tabCounter);
	}

	else if(previousRequestID !== requestDetails.requestId || previousRequestID === '' ) {
		// A new event was recorded
		previousRequestID = requestDetails.requestId;
		console.log("New event: ", JSON.stringify(jsonifyRequestDetails(requestDetails)));
		sendData(JSON.stringify(jsonifyRequestDetails(requestDetails)), websocket);
	}


	else if(previousRequestID === requestDetails.requestId) {
		// One event has multiple request
		console.log("Same Event: ", requestDetails);
		//jsonify -> stringnify -> jsonify, this is the only way for websocket.
		sendData(JSON.stringify(jsonifyRequestDetails(requestDetails)), websocket);
	}

	else {
		previousRequestID = requestDetails.requestId;
		console.log("Other Situation: ", requestDetails);
	}
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
/*
chrome.webRequest.onBeforeRequest.addListener(
	callback,
	{urls: ["<all_urls>"]},
	["blocking"]

);
*/
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