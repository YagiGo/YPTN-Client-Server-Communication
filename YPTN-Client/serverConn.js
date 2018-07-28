var socket = new WebSocket(document.getElementById('ServerURL'));
socket.addEventListener('open', function(event) {
    console.log("Event Example: ", event);
    socket.send("This is a test, will send json in the future");
})

socket.addEventListener('message', function(event) {
    console.log("Event Example: ", event);
    console.log("message from server: ", event.data);
})