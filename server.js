const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let activeUsers = {}; 
// Structure:
// activeUsers[socket.id] = { username, role: 'sender'/'receiver' }

io.on('connection', (socket) => {
    console.log("User connected:", socket.id);

    // User joins with a name
    socket.on("join", (username, callback) => {

        // Case-insensitive duplicate check
        const nameTaken = Object.values(activeUsers).some(
            u => u.username.toLowerCase() === username.toLowerCase()
        );

        if (nameTaken) {
            return callback({ success: false, msg: "Username taken" });
        }

        // Assign receiver if the name is exactly "shiba karki"
        let role = "sender";
        if (username.trim().toLowerCase() === "shiba karki") {
            role = "receiver";
        }

        // Save the user
        activeUsers[socket.id] = { username, role };
        socket.username = username;
        socket.role = role;

        console.log(`${username} joined as ${role}`);

        callback({ success: true, role });

        // Notify receiver about available senders
        updateSenderList();
    });


    // Sender sends a message (later sensor data will also come here)
    socket.on("chat message", (data) => {
        // Only forward to receiver
        const receiverSocket = findReceiverSocket();
        if (receiverSocket) {
            io.to(receiverSocket.id).emit("chat message", data);
        }
    });


    socket.on("disconnect", () => {
        delete activeUsers[socket.id];
        updateSenderList();
    });

    function updateSenderList() {
        const receiverSocket = findReceiverSocket();
        if (!receiverSocket) return;

        const senders = Object.values(activeUsers)
            .filter(u => u.role === "sender")
            .map(u => u.username);

        io.to(receiverSocket.id).emit("sender list", senders);
    }

    function findReceiverSocket() {
        return Object.entries(activeUsers)
            .map(([id, data]) => ({ id, ...data }))
            .find(u => u.role === "receiver");
    }
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
