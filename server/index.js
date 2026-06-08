require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { moderateMessage } = require('./moderator');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Store connected users in memory
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on("typing", (data) => {
  io.to(data.toSocketId).emit("user_typing", {
    fromSocketId: socket.id
  });
});

  // When a user joins, register them
  socket.on('user_join', (userData) => {
    connectedUsers[socket.id] = {
      uid: userData.uid,
      name: userData.name,
      email: userData.email,
      photo: userData.photo,
      socketId: socket.id
    };

    // Broadcast updated user list to everyone
    io.emit('users_update', Object.values(connectedUsers));
    console.log(`${userData.name} joined`);
  });

  // Handle message sending
  socket.on('send_message', async (data) => {
    const { message, toSocketId, fromUser } = data;

    try {
      // Run moderation
      const result = await moderateMessage(message);

      if (result.blocked) {
        // Only tell the SENDER it was blocked
        socket.emit('message_blocked', {
          message,
          reason: result.reason,
          tempId: data.tempId
        });
      } else {
        // Deliver to recipient
        io.to(toSocketId).emit('receive_message', {
          message,
          fromUser,
          timestamp: new Date().toISOString()
        });

        // Also confirm delivery to sender
        socket.emit('message_delivered', {
          message,
          toSocketId,
          timestamp: new Date().toISOString(),
          tempId: data.tempId
        });
      }
    } catch (err) {
      console.error('Moderation error:', err);
      socket.emit('message_error', { tempId: data.tempId });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete connectedUsers[socket.id];
    io.emit('users_update', Object.values(connectedUsers));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
