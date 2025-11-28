const socket = io();

let username = "";
let isReceiver = false;

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");

const userRoleDisplay = document.getElementById("user-role-display");

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const messages = document.getElementById("messages");

// ----------------------------
// LOGIN FORM HANDLER
// ----------------------------
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    username = usernameInput.value.trim();

    if (!username) return;

    // Check for receiver role
    if (username.toLowerCase() === "shiba karki") {
        isReceiver = true;
        userRoleDisplay.textContent = "Logged in as Receiver (Shiba Karki)";
    } else {
        userRoleDisplay.textContent = `Logged in as Sender (${username})`;
    }

    // Show chat screen
    loginScreen.style.display = "none";
    chatScreen.style.display = "block";

    // Notify server
    socket.emit("joined", username);
});


// ----------------------------
// SEND MESSAGE
// ----------------------------
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const msg = messageInput.value.trim();
    if (!msg) return;

    socket.emit("chat message", {
        sender: username,
        message: msg
    });

    messageInput.value = "";
});


// ----------------------------
// RECEIVE MESSAGE
// ----------------------------
socket.on("chat message", (data) => {
    const li = document.createElement("li");
    li.innerHTML = `
        <div class="msg-box">
            <span class="msg-sender">${data.sender}</span>
            <span class="msg-text">${data.message}</span>
        </div>
    `;
    messages.appendChild(li);
});
