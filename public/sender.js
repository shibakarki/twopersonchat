const socket = io();
let localStream;

document.getElementById('join-btn').onclick = async () => {
    const name = document.getElementById('name-input').value.trim();
    if (!name) return alert('Enter name');
    socket.emit('sender-join', name);

    document.getElementById('controls').style.display = 'block';

    // Start camera if enabled
    if (document.getElementById('cameraToggle').checked) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('localVideo').srcObject = localStream;

        // Send frames periodically (simplified)
        const videoTrack = localStream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(videoTrack);

        setInterval(async () => {
            if (document.getElementById('cameraToggle').checked) {
                const bitmap = await imageCapture.grabFrame();
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                canvas.getContext('2d').drawImage(bitmap, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg', 0.5);
                socket.emit('sender-data', { type: 'camera', data: dataURL });
            }
        }, 200); // every 200ms
    }

    // Send location & speed
    setInterval(() => {
        if (navigator.geolocation && document.getElementById('locationToggle').checked) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const speed = pos.coords.speed || 0;
                socket.emit('sender-data', { type: 'location', lat, lon, speed });
            });
        }
    }, 1000); // every second
}, false;
