const socket = io();

document.getElementById('join-btn').onclick = () => {
    const name = document.getElementById('name-input').value.trim();
    if (!name) return alert('Enter name');
    socket.emit('receiver-join', name);
    document.getElementById('sender-list').style.display = 'block';
    document.getElementById('data-display').style.display = 'block';
};

const sendersUl = document.getElementById('senders');
socket.on('update-senders', (senders) => {
    sendersUl.innerHTML = '';
    for (let id in senders) {
        const li = document.createElement('li');
        li.textContent = senders[id];
        li.style.cursor = 'pointer';
        li.onclick = () => {
            socket.emit('subscribe-sender', id);
        };
        sendersUl.appendChild(li);
    }
});

const remoteVideo = document.getElementById('remoteVideo');
const sensorDataDiv = document.getElementById('sensorData');

socket.on('receive-data', (data) => {
    if (data.type === 'camera') {
        remoteVideo.src = data.data;
    } else if (data.type === 'location') {
        sensorDataDiv.innerHTML = `Lat: ${data.lat}, Lon: ${data.lon}, Speed: ${data.speed}`;
    }
});
