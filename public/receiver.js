const socket = io();
let name;
let currentSenderId = null;

document.getElementById('joinBtn').onclick = () => {
    name = document.getElementById('nameInput').value.trim();
    if (!name) return alert('Enter a name');

    document.getElementById('loginDiv').style.display = 'none';
    document.getElementById('receiverUI').style.display = 'block';

    socket.emit('receiver-join', name);
};

const senderListUl = document.getElementById('senderList');
const sensorDataDiv = document.getElementById('sensorData');
const remoteVideo = document.getElementById('remoteVideo');

socket.on('update-senders', senders => {
    senderListUl.innerHTML = '';
    for (let id in senders) {
        const li = document.createElement('li');
        li.textContent = senders[id].name;
        li.onclick = () => {
            currentSenderId = id;
            socket.emit('subscribe-sender', id);
        };
        senderListUl.appendChild(li);
    }
});

socket.on('sensor-data', data => {
    sensorDataDiv.innerHTML = JSON.stringify(data);
});

// WebRTC signaling to receive camera feed will be added here later
