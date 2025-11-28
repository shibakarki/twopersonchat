const socket = io();

let localStream;
let name;

document.getElementById('joinBtn').onclick = async () => {
    name = document.getElementById('nameInput').value.trim();
    if (!name) return alert('Enter a name');

    document.getElementById('loginDiv').style.display = 'none';
    document.getElementById('controls').style.display = 'block';

    socket.emit('sender-join', name);

    // Camera setup
    if (document.getElementById('cameraToggle').checked) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('localVideo').srcObject = localStream;

        // WebRTC peer connection will be setup later for receiver
    }

    // Send location + speed periodically
    setInterval(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const data = {};
                if (document.getElementById('locationToggle').checked) {
                    data.lat = pos.coords.latitude;
                    data.lon = pos.coords.longitude;
                }
                if (document.getElementById('speedToggle').checked) {
                    data.speed = pos.coords.speed || 0;
                }
                if (Object.keys(data).length > 0) {
                    socket.emit('sensor-data', data);
                }
            });
        }
    }, 1000);
};
