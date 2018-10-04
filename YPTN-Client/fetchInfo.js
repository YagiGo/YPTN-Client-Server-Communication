/**
 * Created by zhaoxin on 18/07/26.
 */
let tabCounter = 0; // Tab counter
let previousRequestID = ''; //This is used to record previous request ID for same request
 //Websocket Communication
// let ws = new WebSocket('ws://localhost:8080');
let ws = io("http://localhost:8080");
String.prototype.hashCode = function() {
    let hash = 0;
    if(this.length == 0) return hash;
    for (let i = 0; i < this.length; i++) {
        let char = this.charCodeAt(i);
        hash = ((hash<<5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
};

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

function sendData(eventName, content, websocket) {
	websocket.emit(eventName, content);
    // if(websocket.readyState === 1) {
	// 	websocket.emit(eventName, content);
	// }
	// else if (websocket.readyState === 3) {
	// 	console.log("WebSocket Error!");
	// }
}

function isFrequentlyAccessedSites(websocket) {
    return new Promise((resolve) => {
        websocket.on("AccessFrequencyCheck", (data) => {
            // console.log("data from server: ", data);
            resolve(data);
        });
        // websocket.addEventListener("message", function(event) {
        //     console.log("data from server: ", event.data);
        //     resolve(event.data);
        // });
    }).catch((error) => {
        console.log(error);
    });
    // Receive flag from edge server indicating it is a frequently accessed site\
}

function isSiteCached(websocket) {
    return new Promise(resolve => {
        websocket.on("CacheExistenceCheck", (event) => {
            // console.log("data from server ", event);
            resolve(event);
        });
        // websocket.addEventListener("message", function (event) {
        //     console.log("data from server", event.data);
            // while(event.data !== "cached" || event.data !== "uncached") {
            //     console.log("NO CACHE INFO RECEIVED, WILL KEEP LOOPING");
            //     websocket.onmessage = function(newEvent) {
            //         console.log(newEvent.data);
            //         event = newEvent;
            //     }
            //  }


        // })
    }).catch((error) => {
        console.log(error);
    });
}

function requestCacheFromEdge(websocket) {
    // If this is one of the site in frequently accessed site,
    // request site cache from the edge server
    console.log("Start sending cache back to client");
    websocket.on("SendCache", (event)=> {
       console.log("Cache sent from Edge Server: ", event);
    });
}

function sendNewCacheToEdge(websocket, requestDetails) {
    // If the cache does not exist or has expired
    // send new cache to the edge server. MHTML format for now
    return new Promise(() => {
        if(!requestDetails.url.startsWith("https://www.google.co.jp/complete/search"))
        {
            isFrequentlyAccessedSites(websocket).then((flag) => {
                if (flag === "true") {
                    // Hit! and it is not chrome auto complete request
                    console.log(requestDetails.tabId);
                    console.log("Request Details: ", requestDetails);
                    try
                    {
                        chrome.pageCapture.saveAsMHTML({"tabId" : requestDetails.tabId},
                            function (mhtmlData) {
                                // console.log("Get site in mhtml form");
                                // console.log(mhtmlData);
                                // let temp = bsonifyMHTMLCache(mhtmlData, requestDetails.url, requestDetails.timeStamp);
                                // console.log(temp);
                                bsonifyMHTMLCache(mhtmlData, requestDetails.url, requestDetails.timeStamp)
                                    .then((bsonifiedData) => {
                                        console.log(bsonifiedData);
                                        sendData("SiteCache", JSON.stringify(bsonifiedData), websocket);
                                    })
                            });
                    }
                    catch (e) {
                        console.log("Cache site went wrong: ", e);
                    }
                }
            }).catch((error) => console.log(error));
        }
    });
}



// For jsonifying the data, native websocket doesn't support emit method,
// And I am really lazy and don't wanna rewrite the code for using socket.io ;)
// Maybe in the future I will, but for now, use the identity to identify the data
// UPDATE: Websocket part has been rewritten with socket.io, now it supports emit method

function jsonifyRequestDetails(requestDetails) {
	 
	return	{
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
}

function bsonifyMHTMLCache(mhtmlData, url, timestamp) {
    // Conver the blob into string
    reader = new FileReader();
    /*
    Calling the readAsText method won’t actually return the text.
    Instead, it fires a an event called loadend after it finishes reading the content of the blob.
    You have to handle this event in order to access the content of the blob as text.
    That text is stored in e.srcElement.result, where e is the event object.
     */
    return new Promise(resolve => {
        reader.readAsText(mhtmlData);
        reader.addEventListener("loadend", (e) => {
            let text = e.srcElement.result;
            let result = {
                "identity": "mhtmlData",
                "url": url,
                "digest": url.hashCode(),
                "cache": text,
                "timeStamp": timestamp
            };
            resolve(result);
            // console.log("blob text as string", text);
        });
    })
}

function jsonifyRequestHeader(requestHeader) {
	let result = {"identity": "requestHeaders"};
	requestHeader.forEach(function(element) {
		result[element.name] = element.value;
	});
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
	else if(requestDetails.url.startsWith("https://www.google.co.jp/complete/search"))
    {
        console.log("Chrome Auto Complete Triggered, will ignore");
    }
	else if(previousRequestID !== requestDetails.requestId || previousRequestID === '' ) {
		// A new event was recorded
		previousRequestID = requestDetails.requestId;
		console.log("New event: ", JSON.stringify(jsonifyRequestDetails(requestDetails)));
		// isFrequentlyAccessedSites(websocket); // check if the site is among the frequently accessed sites
		sendNewCacheToEdge(websocket, requestDetails);
        sendData("RequestDetails", JSON.stringify(jsonifyRequestDetails(requestDetails)), websocket);
        if(!requestDetails.url.startsWith("https://www.google.co.jp/complete/search"))
        {
            // Ignore the chrome auto complete request
            //isSiteCached(websocket)
            //    .then((flag) => {
            //        console.log(requestDetails.url , flag);
            //        if(flag === "cached") {
            //            console.log("Found cache, will redirect", requestDetails.url);
            //            requestCacheFromEdge(websocket);
            //            redirectToCache(requestDetails.url);
            //        }
            //    });
            requestCacheFromEdge(websocket, (event) => {
                if(event === "uncached") {}
                else{
                    console.log("Cache sent from edge server received");
                }
            });
        }
	}


	else if(previousRequestID === requestDetails.requestId) {
		// One event has multiple request
		console.log("Same Event: ", requestDetails);
		//jsonify -> stringnify -> jsonify, the proper way for websocket.
		sendData("RequestDetails", JSON.stringify(jsonifyRequestDetails(requestDetails)), websocket);
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

// TEST HERE
// Save the webpage as MHTML in the cache for the most accessed sites


function redirectToCache(url)
	/*
	Process:
	check the most-accessed collection, when the url the user is accessing matches, save the site as MHTML if it has not already been done, if it has, load the MHTML file from the DB
	*/
{   console.log("Redirect url ", url);
    let wr = chrome.declarativeWebRequest;
    chrome.declarativeWebRequest.onRequest.addRules([{
    //First go to the DB to find match in the cache collection
    //Then find the match with the current url
    //If there is one, redirect the request to the mhtml file
    //If there is none, just send the request as it is
    //See UrlFilter https://developer.chrome.com/extensions/events#type-UrlFilter for url filtering guidance

     conditions: [new wr.RequestMatcher({url: {urlMatches: url}})],
     actions: [new wr.RedirectRequest({redirectUrl: "http://google.com"})]
    }]);
}

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(details) {
	    if(!details.url.startsWith("https://www.google.co.jp/complete/search"))
	    // Ignore chrome auto complete request
        {
            details.requestHeaders.forEach(element => {
                if(element.name === "User-Agent") {
                    console.log("User Agent: ", element.value);
                }
            });
            console.log(jsonifyRequestHeader(details.requestHeaders)["User-Agent"]);
            sendData("RequestHeader", JSON.stringify(jsonifyRequestHeader(details.requestHeaders)), websocket=ws);
        }
	},
	{urls: ["<all_urls>"], types: ["main_frame", "sub_frame"]},
	["blocking", "requestHeaders"]
);



// Comment out for test purpose, REMEMBER TO UNCOMMENT!
// chrome.webRequest.onBeforeSendHeaders.addListener(
// 	pageChange,
// 	{urls: ["<all_urls>"], types: ["main_frame"]},
// 	["blocking"]
// );





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