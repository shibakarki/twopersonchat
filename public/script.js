const socket = io();

// Ask for username
let username = "";
function askUsername() {
    username = prompt("Enter your name:").trim();
    if (!username) return askUsername();

    socket.emit('join', username, (accepted) => {
        if (!accepted) {
            alert("Username taken! Please choose another.");
            askUsername();
        }
    });
}
askUsername();

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

    const usernameEl = document.createElement('div');
    usernameEl.classList.add('username');
    usernameEl.textContent = user;

    const textEl = document.createElement('div');
    textEl.classList.add('text');
    textEl.textContent = msg;

    const timeEl = document.createElement('div');
    timeEl.classList.add('timestamp');
    timeEl.textContent = time || new Date().toLocaleTimeString();

    li.appendChild(usernameEl);
    li.appendChild(textEl);
    li.appendChild(timeEl);
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
}
