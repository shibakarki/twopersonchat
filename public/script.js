// script.js
const socket = io();

// UI elements
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const loginError = document.getElementById('login-error');

const mainScreen = document.getElementById('main-screen');
const roleBanner = document.getElementById('role-banner');

const receiverPanel = document.getElementById('receiver-panel');
const senderPanel = document.getElementById('sender-panel');

const senderListDiv = document.getElementById('sender-list');
const incomingFeed = document.getElementById('incoming-feed');
const activityList = document.getElementById('activity-list');
const subscribedToSpan = document.getElementById('subscribed-to');
const unsubscribeBtn = document.getElementById('unsubscribe-btn');

// sender toggles
const toggleChat = document.getElementById('toggle-chat');
const toggleGps = document.getElementById('toggle-gps');
const toggleAccel = document.getElementById('toggle-accel');
const toggleGyro = document.getElementById('toggle-gyro');
const toggleBattery = document.getElementById('toggle-battery');
const toggleNetwork = document.getElementById('toggle-network');
const toggleLight = document.getElementById('toggle-light');
const toggleCamera = document.getElementById('toggle-camera');

const cameraPreview = document.getElementById('camera-preview');
const localVideo = document.getElementById('local-video');

const sendChatForm = document.getElementById('send-chat-form');
const sendChatInput = document.getElementById('send-chat-input');

let username = null;
let role = null;
let subscribedTo = null;

// sensors handlers and ids
let geoWatchId = null;
let accelListener = null;
let gyroListener = null;
let batteryObj = null;
let lightSensor = null;
let localStream = null;

// -------------------- LOGIN --------------------
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loginError.style.display = 'none';

  const name = usernameInput.value.trim();
  if (!name) return;

  socket.emit('join', name, (res) => {
    if (!res || !res.success) {
      loginError.textContent = (res && res.msg) ? res.msg : 'Failed to join';
      loginError.style.display = 'block';
      return;
    }
    username = name;
    role = res.role;
    afterLogin();
  });
});

function afterLogin() {
  loginScreen.style.display = 'none';
  mainScreen.style.display = 'flex';
  roleBanner.textContent = role === 'receiver' ? `Receiver (${username})` : `Sender (${username})`;

  if (role === 'receiver') {
    receiverPanel.style.display = 'block';
    senderPanel.style.display = 'none';
    // request current sender list
    socket.emit('request-sender-list', (senders) => {
      renderSenderList(senders);
    });
  } else {
    // sender UI
    receiverPanel.style.display = 'none';
    senderPanel.style.display = 'block';
  }
}

// -------------------- SENDER UI: toggles --------------------
toggleGps.addEventListener('change', async (e) => {
  if (e.target.checked) {
    // ask permission and start watch
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      e.target.checked = false;
      return;
    }
    geoWatchId = navigator.geolocation.watchPosition(pos => {
      const payload = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed || 0,
        accuracy: pos.coords.accuracy || null,
        timestamp: pos.timestamp
      };
      socket.emit('sensor-data', { sensor: 'gps', payload });
      addActivity(`GPS → ${JSON.stringify(payload)}`);
    }, err => {
      console.warn('geolocation error', err);
      alert('Unable to get location: ' + (err.message || err.code));
      e.target.checked = false;
    }, { enableHighAccuracy: true, maximumAge: 1000 });
  } else {
    // stop
    if (geoWatchId !== null) {
      navigator.geolocation.clearWatch(geoWatchId);
      geoWatchId = null;
    }
  }
});

toggleAccel.addEventListener('change', (e) => {
  if (e.target.checked) {
    accelListener = (ev) => {
      const payload = { x: ev.acceleration?.x, y: ev.acceleration?.y, z: ev.acceleration?.z, time: Date.now() };
      socket.emit('sensor-data', { sensor: 'accel', payload });
      // throttle small updates? skipped for simplicity
    };
    window.addEventListener('devicemotion', accelListener, true);
  } else {
    if (accelListener) {
      window.removeEventListener('devicemotion', accelListener, true);
      accelListener = null;
    }
  }
});

toggleGyro.addEventListener('change', (e) => {
  if (e.target.checked) {
    gyroListener = (ev) => {
      const payload = { alpha: ev.alpha, beta: ev.beta, gamma: ev.gamma, time: Date.now() };
      socket.emit('sensor-data', { sensor: 'gyro', payload });
    };
    window.addEventListener('deviceorientation', gyroListener, true);
  } else {
    if (gyroListener) {
      window.removeEventListener('deviceorientation', gyroListener, true);
      gyroListener = null;
    }
  }
});

toggleBattery.addEventListener('change', async (e) => {
  if (e.target.checked) {
    try {
      batteryObj = await navigator.getBattery();
      const sendBatteryStatus = () => {
        const payload = { level: batteryObj.level, charging: batteryObj.charging, time: Date.now() };
        socket.emit('sensor-data', { sensor: 'battery', payload });
      };
      sendBatteryStatus();
      batteryObj.addEventListener('levelchange', sendBatteryStatus);
      batteryObj.addEventListener('chargingchange', sendBatteryStatus);
    } catch (err) {
      console.warn('Battery API not available', err);
      alert('Battery API not available on this device.');
      e.target.checked = false;
    }
  } else {
    if (batteryObj) {
      try {
        batteryObj.removeEventListener('levelchange', () => {});
        batteryObj.removeEventListener('chargingchange', () => {});
      } catch {}
      batteryObj = null;
    }
  }
});

toggleNetwork.addEventListener('change', (e) => {
  if (e.target.checked) {
    const sendNetwork = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const payload = { type: connection ? connection.effectiveType || connection.type : 'unknown', online: navigator.onLine, time: Date.now() };
      socket.emit('sensor-data', { sensor: 'network', payload });
    };
    // send immediately
    sendNetwork();
    window.addEventListener('online', sendNetwork);
    window.addEventListener('offline', sendNetwork);
  } else {
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
  }
});

toggleLight.addEventListener('change', async (e) => {
  if (e.target.checked) {
    // AmbientLightSensor is not widely supported. Try fallback to light-level if available.
    try {
      if ('AmbientLightSensor' in window) {
        lightSensor = new AmbientLightSensor();
        lightSensor.addEventListener('reading', () => {
          const payload = { lux: lightSensor.illuminance, time: Date.now() };
          socket.emit('sensor-data', { sensor: 'light', payload });
        });
        lightSensor.start();
      } else {
        alert('AmbientLightSensor not supported in this browser.');
        e.target.checked = false;
      }
    } catch (err) {
      console.warn('AmbientLightSensor failed', err);
      alert('Could not start ambient light sensor: ' + (err.message || err));
      e.target.checked = false;
    }
  } else {
    if (lightSensor) {
      try { lightSensor.stop(); } catch {}
      lightSensor = null;
    }
  }
});

toggleCamera.addEventListener('change', async (e) => {
  if (e.target.checked) {
    // Request camera permission and show preview (no streaming via WebRTC here yet)
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localVideo.srcObject = localStream;
      cameraPreview.style.display = 'block';
      socket.emit('sensor-data', { sensor: 'camera-enabled', payload: { enabled: true }});
    } catch (err) {
      alert('Camera access denied or not available.');
      e.target.checked = false;
    }
  } else {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    cameraPreview.style.display = 'none';
    socket.emit('sensor-data', { sensor: 'camera-enabled', payload: { enabled: false }});
  }
});

// -------------------- SENDER: chat send --------------------
sendChatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!toggleChat.checked) {
    alert('Chat sending is disabled by toggle.');
    return;
  }
  const msg = sendChatInput.value.trim();
  if (!msg) return;
  socket.emit('chat', { message: msg });
  addActivity(`You (chat): ${msg}`);
  sendChatInput.value = '';
});

// -------------------- RECEIVER: UI & subscribe --------------------
function renderSenderList(list) {
  senderListDiv.innerHTML = '';
  if (!list || list.length === 0) {
    senderListDiv.innerHTML = '<div class="muted">No senders online</div>';
    return;
  }
  list.forEach(name => {
    const item = document.createElement('div');
    item.className = 'sender-item';
    item.innerHTML = `<div class="name">${name}</div><div class="status">online</div>`;
    item.addEventListener('click', () => {
      // click to subscribe
      socket.emit('subscribe', name, (res) => {
        if (res && res.success) {
          subscribedTo = res.subscribedTo;
          subscribedToSpan.textContent = subscribedTo;
          unsubscribeBtn.style.display = 'inline-block';
          incomingFeed.innerHTML = `<div class="muted">Subscribed to ${subscribedTo}. Waiting for data...</div>`;
        } else {
          alert(res && res.msg ? res.msg : 'Subscribe failed');
        }
      });
    });
    senderListDiv.appendChild(item);
  });
}

unsubscribeBtn.addEventListener('click', () => {
  socket.emit('unsubscribe', (res) => {
    if (res && res.success) {
      subscribedTo = null;
      subscribedToSpan.textContent = 'None';
      unsubscribeBtn.style.display = 'none';
      incomingFeed.innerHTML = `<div class="muted">Unsubscribed. Choose a sender to subscribe to.</div>`;
    }
  });
});

// -------------------- INCOMING FOR RECEIVER --------------------
socket.on('sender-list', (list) => {
  renderSenderList(list);
});

// All forwarded data from server
socket.on('forward', (data) => {
  // data: { type: 'chat'|'sensor', ... }
  const timeStr = new Date(data.time || Date.now()).toLocaleTimeString();
  if (role === 'receiver') {
    // display in incoming feed
    const box = document.createElement('div');
    box.className = 'activity-item';
    if (data.type === 'chat') {
      box.innerHTML = `<div><strong>${data.sender}</strong> (chat) <span class="meta">${timeStr}</span></div><div>${escapeHtml(data.message)}</div>`;
    } else if (data.type === 'sensor') {
      box.innerHTML = `<div><strong>${data.sender}</strong> (${data.sensor}) <span class="meta">${timeStr}</span></div><div><pre>${escapeHtml(JSON.stringify(data.payload))}</pre></div>`;
    }
    // prepend to feed
    incomingFeed.insertBefore(box, incomingFeed.firstChild);
    // also add to global activity list
    addActivity(`[${timeStr}] ${data.sender} → ${data.type} (${data.sensor || 'n/a'})`);
  }
});

// -------------------- general updates --------------------
socket.on('connect', () => {
  addActivity('Connected to server');
});
socket.on('disconnect', () => {
  addActivity('Disconnected from server');
});

// -------------------- helpers --------------------
function addActivity(text) {
  const el = document.createElement('div');
  el.className = 'activity-item';
  el.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
  // insert at top
  activityList.insertBefore(el, activityList.firstChild);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
