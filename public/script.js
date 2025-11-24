const socket = io();

// Ask for username
let username = "";
while (!username) {
    username = prompt("Enter your name:").trim();
}

const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (msg) {
        appendMessage(msg, username, true);
        socket.emit('chat message', { username, message: msg, time: new Date().toLocaleTimeString() });
        input.value = '';
    }
});

socket.on('chat message', (data) => {
    if (data.username !== username) {
        appendMessage(data.message, data.username, false, data.time);
    }
});

function appendMessage(msg, user, isSelf, time = null) {
    const li = document.createElement('li');
    li.classList.add('message');
    li.classList.add(isSelf ? 'self' : 'other');
    
    const text = document.createElement('div');
    text.textContent = msg;
    
    const timeEl = document.createElement('div');
    timeEl.classList.add('timestamp');
    timeEl.textContent = time || new Date().toLocaleTimeString();
    
    li.appendChild(text);
    li.appendChild(timeEl);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
}
