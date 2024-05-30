document.getElementById('sendFriendRequest').addEventListener('click', function(event) {
    event.preventDefault();
    // const id = getReceiverId();
    sendFriendRequest("{{id}}", onFriendRequestSent);
});

function getReceiverId() {
        var url = window.location.href;
        var urlParts = url.split('/');
        const id = urlParts[urlParts.length - 1];
    
    return id;
}

function sendFriendRequest(receiver_id, uiUpdateFunction) {

    fetch('/friend/request', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken') 
        },
        body: JSON.stringify({ receiver_id }),
    })
    .then(response => {
        
    })
    .catch(error => {
    });
}