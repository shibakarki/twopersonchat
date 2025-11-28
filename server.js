const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Keep track of online senders
let onlineSenders = {};

// Mapping of receiver subscriptions: receiverId → senderId
let subscriptions = {};

io.on('connection', socket => {
    console.log('User connected:', socket.id);

    // Sender joins
    socket.on('sender-join', name => {
        socket.isSender = true;
        socket.username = name;
        onlineSenders[socket.id] = { name, socketId: socket.id };
        // Update all receivers
        io.emit('update-senders', onlineSenders);
    });

    // Receiver joins
    socket.on('receiver-join', name => {
        socket.isReceiver = true;
        socket.username = name;
        // Send current online senders to new receiver
        socket.emit('update-senders', onlineSenders);
    });

    // Receiver subscribes to a sender
    socket.on('subscribe-sender', senderId => {
        subscriptions[socket.id] = senderId;
    });

    // Sender sends sensor data
    socket.on('sensor-data', data => {
        // Forward to all receivers subscribed to this sender
        for (let [receiverId, senderId] of Object.entries(subscriptions)) {
            if (senderId === socket.id) {
                io.to(receiverId).emit('sensor-data', data);
            }
        }
    });

    // Sender sends WebRTC signaling data
    socket.on('webrtc-signal', ({ targetId, signal }) => {
        io.to(targetId).emit('webrtc-signal', { fromId: socket.id, signal });
    });

    socket.on('disconnect', () => {
        if (socket.isSender) {
            delete onlineSenders[socket.id];
            io.emit('update-senders', onlineSenders);
        } else if (socket.isReceiver) {
            delete subscriptions[socket.id];
        }
        console.log('User disconnected:', socket.id);
    });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
