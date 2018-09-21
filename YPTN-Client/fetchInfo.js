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
*/




function openNeWTab(requestDetails) {
	// Do something when user open a new tab
	if(requestDetails.url === "https://www.google.co.jp/_/chrome/newtab?ie=UTF-8") {
		tabCounter += 1;
		console.log("The user has opened a new tab\n current tab count:", tabCounter);
	}
}

function sendData(content, websocket) {
	if(websocket.readyState === 1) {
		websocket.send(content);
	}
	else if (websocket.readyState === 3) {
		console.log("WebSocket Error!");
	}
}
// For jsonifying the data, native websocket doesn't support emit method,
// And I am really lazy and don't wanna rewrite the code for using socket.io ;)
// Maybe in the future I will, but for now, use the identity to identify the data
function jsonifyRequestDetails(requestDetails) {
	 
	let result =	{
			"identity": "requestDetails",
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

function jsonifyRequestHeader(requestHeader) {
	let result = {"identity": "requestHeaders"};
	requestHeader.forEach(function(element) {
		result[element.name] = element.value;
	})
	return result;
}

// A uuid function
function uuid() {
    let s = [];
    let hexDigits = "0123456789abcdef";
    for (let i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";
 
    var uuid = s.join("");
    return uuid;
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
		//jsonify -> stringnify -> jsonify, the proper way for websocket.
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

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(details) {
		details.requestHeaders.forEach(element => {
			if(element.name === "User-Agent") {
				console.log("User Agent: ", element.value);
			}
		});
		console.log(jsonifyRequestHeader(details.requestHeaders)["User-Agent"]);
		sendData(JSON.stringify(jsonifyRequestHeader(details.requestHeaders)), websocket=ws);
	},
	{urls: ["<all_urls>"], types: ["main_frame"]},
	["blocking", "requestHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
	pageChange,
	{urls: ["<all_urls>"], types: ["main_frame"]},
	["blocking"]
);

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

chrome.webRequest.onBeforeRequest.addListener(
	openNeWTab,
	{urls: ["<all_urls>"], types: ['main_frame']},
	['blocking']
);

/*
chrome.webRequest.onBeforeSendHeaders.addListener(
    callback,
    {urls: ["<all_urls>"], types: ["main_frame"]},
    ["blocking"]
);
*/