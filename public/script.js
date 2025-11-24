const socket = io();

// Elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const onlineUserSpan = document.getElementById('onlineUser');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let myName = '';

// Login
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        myName = name;
        loginContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        socket.emit('login', myName);
    }
});

// Update online status
socket.on('status', (data) => {
    if (data.onlineUser) {
        onlineUserSpan.textContent = data.onlineUser;
    } else {
        onlineUserSpan.textContent = 'None';
    }
});

// Send message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const msg = messageInput.value.trim();
    if (msg && onlineUserSpan.textContent !== 'None') {
        socket.emit('chat message', msg);
        messageInput.value = '';
    }
}

// Receive message
socket.on('chat message', (data) => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(data.username === myName ? 'self' : 'other');
    div.textContent = `${data.username}: ${data.msg}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
