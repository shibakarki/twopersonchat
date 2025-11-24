const socket = io();

// Ask for username when joining
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
        appendMessage(`${username}: ${msg}`, true);
        socket.emit('chat message', { username, message: msg });
        input.value = '';
    }
});

socket.on('chat message', (data) => {
    if (data.username !== username) {
        appendMessage(`${data.username}: ${data.message}`, false);
    }
});

function appendMessage(msg, isSelf) {
    const li = document.createElement('li');
    li.textContent = msg;
    li.style.background = isSelf ? '#d1ffd6' : '#e2e2e2'; // differentiate sender
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
}
