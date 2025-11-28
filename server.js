const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let onlineSenders = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Sender joins
    socket.on('sender-join', (name) => {
        socket.isSender = true;
        socket.username = name;
        onlineSenders[socket.id] = name;

        // Notify all receivers of updated sender list
        io.emit('update-senders', onlineSenders);
        console.log(`Sender joined: ${name}`);
    });

    // Receiver joins
    socket.on('receiver-join', (name) => {
        socket.isReceiver = true;
        socket.username = name;
        console.log(`Receiver joined: ${name}`);
    });

    // Receiver chooses a sender
    socket.on('subscribe-sender', (senderId) => {
        socket.subscribedSender = senderId;
        console.log(`${socket.username} subscribed to ${onlineSenders[senderId]}`);
    });

    // Sender sends data
    socket.on('sender-data', (data) => {
        // Forward data to all receivers subscribed to this sender
        for (let [id, s] of io.sockets.sockets) {
            if (s.subscribedSender === socket.id) {
                s.emit('receive-data', data);
            }
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.isSender) {
            delete onlineSenders[socket.id];
            io.emit('update-senders', onlineSenders);
            console.log(`Sender disconnected: ${socket.username}`);
        } else {
            console.log(`User disconnected: ${socket.username}`);
        }
    });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
