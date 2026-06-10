require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { moderateMessage } = require('./moderator');
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET','POST'] } });
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/messages/:uid1/:uid2', async (req, res) => {
  const chatId = [req.params.uid1, req.params.uid2].sort().join('_');
  try {
    const snap = await db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp','asc').get();
    res.json(snap.docs.map(d => d.data()));
  } catch(err) { res.status(500).json({ error: err.message }); }
});

const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('typing', (data) => {
    io.to(data.toSocketId).emit('user_typing', { fromSocketId: socket.id });
  });

  socket.on('user_join', async (u) => {
    connectedUsers[socket.id] = { uid:u.uid, name:u.name, email:u.email, photo:u.photo, socketId:socket.id };
    await db.collection('users').doc(u.uid).set({ uid:u.uid, name:u.name, email:u.email, photo:u.photo, isOnline:true, lastSeen:admin.firestore.FieldValue.serverTimestamp() }, { merge:true });
    io.emit('users_update', Object.values(connectedUsers));
    console.log(u.name + ' joined');
  });

  socket.on('send_message', async (data) => {
    const { message, toSocketId, fromUser, type } = data;
    const msgType = type || 'text';
    const toUid = connectedUsers[toSocketId] ? connectedUsers[toSocketId].uid : null;
    const chatId = toUid ? [fromUser.uid, toUid].sort().join('_') : null;

    if (msgType === 'voice') {
      const msgData = { id:data.tempId, text:'', audioData:message, type:'voice', from:fromUser.uid, fromUser, to:toUid||'', timestamp:new Date().toISOString(), status:'delivered' };
      if (chatId) await db.collection('chats').doc(chatId).collection('messages').add(msgData);
      io.to(toSocketId).emit('receive_message', msgData);
      socket.emit('message_delivered', Object.assign({}, msgData, { toSocketId }));
      return;
    }

    try {
      const result = await moderateMessage(message);
      if (result.blocked) {
        socket.emit('message_blocked', { message, reason:result.reason, tempId:data.tempId });
      } else {
        const msgData = { id:data.tempId, text:message, type:'text', from:fromUser.uid, fromUser, to:toUid||'', timestamp:new Date().toISOString(), status:'delivered' };
        if (chatId) await db.collection('chats').doc(chatId).collection('messages').add(msgData);
        io.to(toSocketId).emit('receive_message', msgData);
        socket.emit('message_delivered', Object.assign({}, msgData, { toSocketId }));
      }
    } catch(err) {
      console.error('Moderation error:', err);
      socket.emit('message_error', { tempId:data.tempId });
    }
  });

  socket.on('disconnect', async () => {
    const u = connectedUsers[socket.id];
    if (u) await db.collection('users').doc(u.uid).update({ isOnline:false, lastSeen:admin.firestore.FieldValue.serverTimestamp() }).catch(function(){});
    delete connectedUsers[socket.id];
    io.emit('users_update', Object.values(connectedUsers));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, function() { console.log('Server running on port ' + PORT); });
