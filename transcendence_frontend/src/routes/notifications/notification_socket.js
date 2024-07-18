import {
    getFirstGeneralNotificationsPage,
    handleGeneralNotificationsData,
    refreshGeneralNotificationsData,
    setGeneralPaginationExhausted,
    setupGeneralNotificationsMenu,
    updateGeneralNotificationDiv
} from './notification';

// Correctly decide between ws:// and wss://
var ws_scheme = window.location.protocol == "https:" ? "wss" : "ws";
// var ws_path = ws_scheme + '://' + window.location.host + ":8001/"; // PRODUCTION
var ws_path = ws_scheme + '://' + window.location.host + "/";
// console.log("Connecting to " + ws_path);
var notificationSocket = new WebSocket(ws_path);

// Handle incoming messages
notificationSocket.onmessage = function(message) {
    console.log("Got notification websocket message.");
    var data = JSON.parse(message.data);
    console.log(data);

    /*
        GENERAL NOTIFICATIONS
    */
    // new 'general' notifications data payload
    if(data.general_msg_type == 0){
        handleGeneralNotificationsData(data['notifications'], data['new_page_number'])
    }
    // "General" Pagination exhausted. No more results.
    if(data.general_msg_type == 1){
        setGeneralPaginationExhausted()
    }
    if(data.general_msg_type == 2){
        refreshGeneralNotificationsData(data.notifications)
    }
    if(data.general_msg_type == 5){
        updateGeneralNotificationDiv(data['notification'])
    }
}

notificationSocket.onclose = function(e) {
    console.error('Notification Socket closed unexpectedly');
};

notificationSocket.onopen = function(e){
    console.log("Notification Socket on open: " + e)
    setupGeneralNotificationsMenu()
    getFirstGeneralNotificationsPage()
}

notificationSocket.onerror = function(e){
    console.log('Notification Socket error', e)
}

if (notificationSocket.readyState == WebSocket.OPEN) {
    console.log("Notification Socket OPEN complete.")
} 
else if (notificationSocket.readyState == WebSocket.CONNECTING){
    console.log("Notification Socket connecting..")
}