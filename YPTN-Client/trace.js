/* Try to do something with the cookies here */

chrome.cookies.getAll({"url":"https://www.google.com"},
    function (cookie) {
        console.log("Save cookie for edge server to use");
    });

function setCookie(cookie) {

    chrome.cookies.set(
        {"url":cookie.url,
         "name":cookie.name,
         "value":cookie.value,
         "domain":cookie.domain,
         "path":cookie.path,
         "secure":cookie.secure,
         "httpOnly":cookie.httpOnly,
         "expirationDate":cookie.expirationDate,
         "storeId":cookie.storeId}
    )

}
