const socket = io();

const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (msg) {
        appendMessage(`You: ${msg}`);
        socket.emit('chat message', msg);
        input.value = '';
    }
});

socket.on('chat message', (msg) => {
    appendMessage(`Friend: ${msg}`);
});

function appendMessage(msg) {
    const li = document.createElement('li');
    li.textContent = msg;
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
}
