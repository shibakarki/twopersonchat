const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let activeUsers = []; // Track usernames

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (username, callback) => {
        // Check if username already exists (case-insensitive)
        if (activeUsers.some(u => u.toLowerCase() === username.toLowerCase())) {
            callback(false); // username taken
        } else {
            activeUsers.push(username);
            socket.username = username;
            callback(true); // username accepted
            console.log(`${username} joined the chat.`);
        }
    });

    socket.on('chat message', (data) => {
        socket.broadcast.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            activeUsers = activeUsers.filter(u => u !== socket.username);
            console.log(`${socket.username} disconnected.`);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
