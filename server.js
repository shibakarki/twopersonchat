// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

/*
  activeUsers: {
    socketId: { username, role }   // role = 'receiver' or 'sender'
  }
*/
const activeUsers = {};

// Track receiver socket id (there should generally be only one receiver named exactly "shiba karki")
let receiverSocketId = null;
// Which sender the receiver is currently subscribed to (username string) or null
let receiverSubscribedTo = null;

function broadcastSenderListToReceiver() {
  if (!receiverSocketId) return;
  const senders = Object.values(activeUsers)
    .filter(u => u.role === 'sender')
    .map(u => u.username);
  io.to(receiverSocketId).emit('sender-list', senders);
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', (username, ack) => {
    if (!username || typeof username !== 'string') return ack && ack({ success: false, msg: 'Invalid name' });

    const normalized = username.trim();
    if (!normalized) return ack && ack({ success: false, msg: 'Empty name' });

    // Check duplicates case-insensitive
    const nameTaken = Object.values(activeUsers).some(u => u.username.toLowerCase() === normalized.toLowerCase());
    if (nameTaken) {
      return ack && ack({ success: false, msg: 'Username already taken' });
    }

    const role = (normalized.toLowerCase() === 'shiba karki') ? 'receiver' : 'sender';

    activeUsers[socket.id] = { username: normalized, role };
    socket.username = normalized;
    socket.role = role;

    if (role === 'receiver') {
      receiverSocketId = socket.id;
      console.log(`${normalized} joined as RECEIVER`);
    } else {
      console.log(`${normalized} joined as SENDER`);
    }

    // Send ack
    ack && ack({ success: true, role });

    // Update receiver (if present) with sender list
    broadcastSenderListToReceiver();
  });

  // Sender sends chat message (or simple text)
  socket.on('chat', (data) => {
    // data: { message }
    if (!socket.username) return;
    const senderName = socket.username;
    const payload = { type: 'chat', sender: senderName, message: data.message, time: Date.now() };

    // Forward only if receiver exists AND receiver subscribed to this sender
    if (receiverSocketId && receiverSubscribedTo && receiverSubscribedTo.toLowerCase() === senderName.toLowerCase()) {
      io.to(receiverSocketId).emit('forward', payload);
    }
  });

  // Sender sends sensor data
  socket.on('sensor-data', (data) => {
    // data: { sensor: "gps"|"gyro"|..., payload: {...}, time }
    if (!socket.username) return;
    const senderName = socket.username;
    const payload = { type: 'sensor', sensor: data.sensor, sender: senderName, payload: data.payload, time: Date.now() };

    if (receiverSocketId && receiverSubscribedTo && receiverSubscribedTo.toLowerCase() === senderName.toLowerCase()) {
      io.to(receiverSocketId).emit('forward', payload);
    }
  });

  // Receiver requests to subscribe to a specific sender username
  socket.on('subscribe', (senderName, ack) => {
    if (!socket.username || socket.role !== 'receiver') {
      return ack && ack({ success: false, msg: 'Only receiver can subscribe' });
    }
    // check sender exists
    const senderExists = Object.values(activeUsers).some(u => u.role === 'sender' && u.username.toLowerCase() === String(senderName).toLowerCase());
    if (!senderExists) {
      receiverSubscribedTo = null;
      return ack && ack({ success: false, msg: 'Sender not found' });
    }
    receiverSubscribedTo = senderName;
    ack && ack({ success: true, subscribedTo: receiverSubscribedTo });
    console.log(`Receiver subscribed to ${receiverSubscribedTo}`);
  });

  // Receiver wants to unsubscribe
  socket.on('unsubscribe', (ack) => {
    if (!socket.username || socket.role !== 'receiver') return ack && ack({ success: false });
    receiverSubscribedTo = null;
    ack && ack({ success: true });
  });

  // Provide current sender list on demand
  socket.on('request-sender-list', (ack) => {
    const senders = Object.values(activeUsers).filter(u => u.role === 'sender').map(u => u.username);
    ack && ack(senders);
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    // If disconnected user was receiver, clear receiver pointer and subscription
    if (activeUsers[socket.id]) {
      if (activeUsers[socket.id].role === 'receiver') {
        receiverSocketId = null;
        receiverSubscribedTo = null;
      }
      delete activeUsers[socket.id];
    }
    // Notify receiver (if exists) of updated sender list
    broadcastSenderListToReceiver();
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
