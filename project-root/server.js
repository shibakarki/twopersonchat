// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // Serve index.html, CSS, JS

let onlineUser = null; // Track who is online

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle login
    socket.on('login', (username) => {
        socket.username = username;
        onlineUser = username;
        io.emit('status', { onlineUser });
        console.log(`${username} is online`);
    });

    // Handle chat messages
    socket.on('chat message', (msg) => {
        if (onlineUser && socket.username) {
            io.emit('chat message', { username: socket.username, msg });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.username === onlineUser) {
            onlineUser = null;
            io.emit('status', { onlineUser });
            console.log(`${socket.username} disconnected`);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
