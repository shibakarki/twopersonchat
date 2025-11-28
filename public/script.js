const socket = io();

let username = "";
let role = "";

function askUsername() {
    username = prompt("Enter your name:").trim();
    if (!username) return askUsername();

    socket.emit("join", username, (res) => {
        if (!res.success) {
            alert(res.msg);
            askUsername();
        } else {
            role = res.role;
            console.log("Logged in as:", role);

            if (role === "receiver") {
                document.getElementById("receiver-panel").style.display = "block";
            }
        }
    });
}
askUsername();

const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");
const senderListDiv = document.getElementById("sender-list");


form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (role !== "sender") {
        alert("Only senders can send messages!");
        return;
    }

    const msg = input.value.trim();
    if (msg) {
        socket.emit("chat message", {
            username,
            message: msg,
            time: new Date().toLocaleTimeString(),
        });

        appendMessage(msg, username, true);
        input.value = "";
    }
});


socket.on("chat message", (data) => {
    appendMessage(data.message, data.username, false);
});

socket.on("sender list", (list) => {
    senderListDiv.innerHTML = "";
    list.forEach(s => {
        const div = document.createElement("div");
        div.className = "sender-item";
        div.textContent = s;
        senderListDiv.appendChild(div);
    });
});


function appendMessage(msg, user, isSelf) {
    const li = document.createElement("li");
    li.classList.add("message");
    li.classList.add(isSelf ? "self" : "other");

    li.innerHTML = `
        <div class="name">${user}</div>
        <div class="text">${msg}</div>
        <div class="timestamp">${new Date().toLocaleTimeString()}</div>
    `;

    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
}
