const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Track connected users
let controller = null;
let device = null;
let currentIntensity = 0; // Default intensity

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle role assignment
  socket.on('register', (data) => {
    const { role, name } = data;
    socket.role = role;
    socket.userName = name;

    if (role === 'controller') {
      // Disconnect previous controller if exists
      if (controller && controller !== socket.id) {
        io.to(controller).emit('disconnected', { message: 'Another controller connected' });
      }
      controller = socket.id;
      console.log(`Controller registered: ${name} (${socket.id})`);
      
      // Send current intensity to new controller
      socket.emit('currentIntensity', { intensity: currentIntensity });
      
      // Notify device that controller is online
      if (device) {
        io.to(device).emit('controllerStatus', { online: true });
      }
    } else if (role === 'device') {
      // Disconnect previous device if exists
      if (device && device !== socket.id) {
        io.to(device).emit('disconnected', { message: 'Another device connected' });
      }
      device = socket.id;
      console.log(`Device registered: ${name} (${socket.id})`);
      
      // Send current intensity to new device
      socket.emit('intensityChange', { intensity: currentIntensity });
      
      // Notify device about controller status
      socket.emit('controllerStatus', { online: controller !== null });
    }
  });

  // Handle intensity change from controller
  socket.on('setIntensity', (data) => {
    if (socket.role === 'controller') {
      currentIntensity = data.intensity;
      console.log(`Intensity set to: ${currentIntensity}%`);
      
      // Forward to device
      if (device) {
        io.to(device).emit('intensityChange', { intensity: currentIntensity });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (socket.id === controller) {
      controller = null;
      console.log('Controller disconnected');
      
      // Notify device
      if (device) {
        io.to(device).emit('controllerStatus', { online: false });
      }
    } else if (socket.id === device) {
      device = null;
      console.log('Device disconnected');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}`);
});