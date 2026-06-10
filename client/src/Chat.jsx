import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';

const SERVER = 'https://wingmann-server.onrender.com';
const BLOCKED_MSG = 'To keep things safe, lets chat here until you meet at one of our partnered cafes';

export default function Chat({ user, onLogout }) {
  const socketRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserRef = useRef(null);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [notifications, setNotifications] = useState({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowSidebar(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const socket = io(SERVER);
    socketRef.current = socket;
    if (Notification.permission === 'default') Notification.requestPermission();
    socket.emit('user_join', { uid:user.uid, name:user.displayName, email:user.email, photo:user.photoURL });

    socket.on('users_update', (updated) => {
      const seen = new Set();
      setUsers(updated.filter(u => u.uid !== user.uid).filter(u => {
        if (seen.has(u.uid)) return false;
        seen.add(u.uid); return true;
      }));
    });

    socket.on('message_delivered', (data) => {
      setMessages(prev => ({ ...prev, [data.toSocketId]: [...(prev[data.toSocketId]||[]), { text:data.text, audioData:data.audioData, type:data.type||'text', from:'me', status:'delivered', timestamp:data.timestamp, id:data.id }] }));
      setChecking(false);
    });

    socket.on('message_blocked', (data) => {
      const key = selectedUserRef.current?.socketId;
      setMessages(prev => ({ ...prev, [key]: [...(prev[key]||[]),
        { text:data.message, from:'me', type:'text', status:'blocked', timestamp:new Date().toISOString(), id:data.tempId },
        { text:BLOCKED_MSG, from:'system', timestamp:new Date().toISOString() }
      ]}));
      setChecking(false);
    });

    socket.on('receive_message', (data) => {
      const key = data.fromUser.socketId;
      setMessages(prev => ({ ...prev, [key]: [...(prev[key]||[]), { text:data.text, audioData:data.audioData, type:data.type||'text', from:'them', timestamp:data.timestamp }] }));
      if (selectedUserRef.current?.socketId !== key) {
        setNotifications(prev => ({ ...prev, [key]: (prev[key]||0)+1 }));
        if (Notification.permission === 'granted')
          new Notification('New message from ' + data.fromUser.name, { body: data.text || 'Voice message', icon: data.fromUser.photo });
      }
    });

    socket.on('user_typing', (data) => {
      setTypingUsers(prev => ({ ...prev, [data.fromSocketId]: true }));
      setTimeout(() => setTypingUsers(prev => ({ ...prev, [data.fromSocketId]: false })), 2000);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    fetch(SERVER + '/messages/' + user.uid + '/' + selectedUser.uid)
      .then(r => r.json())
      .then(history => {
        const fmt = history.map(m => ({ text:m.text, audioData:m.audioData, type:m.type||'text', from:m.from===user.uid?'me':'them', status:m.status, timestamp:m.timestamp, id:m.id }));
        setMessages(prev => ({ ...prev, [selectedUser.socketId]: fmt }));
      }).catch(e => console.error('History load failed:', e));
  }, [selectedUser?.uid]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const sendMessage = (text) => {
    const msg = text !== undefined ? text : input;
    if (!msg.trim() || !selectedUser) return;
    setChecking(true);
    socketRef.current.emit('send_message', { message:msg, toSocketId:selectedUser.socketId, type:'text', fromUser:{ uid:user.uid, name:user.displayName, photo:user.photoURL, socketId:socketRef.current.id }, tempId:Date.now().toString() });
    setInput('');
    setShowEmoji(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type:'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          socketRef.current.emit('send_message', { message:reader.result, toSocketId:selectedUser.socketId, type:'voice', fromUser:{ uid:user.uid, name:user.displayName, photo:user.photoURL, socketId:socketRef.current.id }, tempId:Date.now().toString() });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch(e) { console.error('Mic error:', e); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
  const currentMessages = messages[selectedUser?.socketId] || [];

  const Avatar = ({ name, photo, size=36 }) => (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <div style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'linear-gradient(135deg,#ac1ed6,#c26e73)' }} />
      <img src={photo} alt={name} onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed='+name; }}
        style={{ position:'absolute', inset:2, borderRadius:'50%', width:size-4, height:size-4, objectFit:'cover' }} />
    </div>
  );

  const selectUser = (u) => {
    setSelectedUser(u);
    setNotifications(prev => ({ ...prev, [u.socketId]:0 }));
    if (isMobile) setShowSidebar(false);
  };

  return (
    <div style={{ height:'100vh', width:'100vw', display:'flex', background:'#090607', fontFamily:'Epilogue,sans-serif', overflow:'hidden', position:'relative' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700&display=swap');
        @keyframes popIn { from{transform:scale(0.85);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .msg-in { animation: popIn 0.2s ease; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#333; border-radius:4px; }
        .user-row:hover { background: rgba(172,30,214,0.08) !important; }
        .input-field:focus { outline:none; }
      `}} />

      {(showSidebar || !isMobile) && (
        <div style={{ width:isMobile?'100vw':'300px', display:'flex', flexDirection:'column', flexShrink:0, background:'#0f0d0e', borderRight:'1px solid #1a1a1a', position:isMobile?'absolute':'relative', zIndex:10, height:'100vh' }}>
          <div style={{ padding:'20px 16px 14px', borderBottom:'1px solid #1a1a1a' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#ac1ed6,#c26e73)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'#fff', fontWeight:700 }}>✦</div>
                <span style={{ fontSize:'18px', fontWeight:700, color:'#fff', letterSpacing:'-0.3px' }}>Wingmann</span>
              </div>
              <button onClick={onLogout} style={{ fontSize:'11px', color:'#666', background:'#1a1a1a', border:'none', borderRadius:'20px', padding:'4px 10px', cursor:'pointer' }}>logout</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', background:'#1a1a1a', borderRadius:'12px' }}>
              <Avatar name={user.displayName} photo={user.photoURL} size={36} />
              <div>
                <div style={{ fontSize:'13px', fontWeight:600, color:'#fff' }}>{user.displayName}</div>
                <div style={{ fontSize:'11px', color:'#4ade80' }}>● Online</div>
              </div>
            </div>
          </div>
          <div style={{ padding:'12px 16px 4px', fontSize:'10px', color:'#444', letterSpacing:'1.2px', textTransform:'uppercase' }}>Messages · {users.length}</div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {users.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#444', fontSize:'13px' }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>👥</div>No one online yet
              </div>
            ) : users.map((u) => (
              <div key={u.socketId} className='user-row' onClick={() => selectUser(u)}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', cursor:'pointer', background:selectedUser?.socketId===u.socketId?'rgba(172,30,214,0.12)':'transparent', borderLeft:selectedUser?.socketId===u.socketId?'3px solid #ac1ed6':'3px solid transparent', transition:'all 0.15s' }}>
                <Avatar name={u.name} photo={u.photo} size={42} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'#fff' }}>{u.name}</div>
                  <div style={{ fontSize:'11px', color:typingUsers[u.socketId]?'#f97316':'#4ade80' }}>{typingUsers[u.socketId]?'typing...':'● active now'}</div>
                </div>
                {notifications[u.socketId] > 0 && (
                  <div style={{ background:'linear-gradient(135deg,#ac1ed6,#c26e73)', color:'#fff', borderRadius:'50%', width:20, height:20, fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{notifications[u.socketId]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!isMobile || !showSidebar) && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {selectedUser ? (
            <>
              <div style={{ background:'#0f0d0e', borderBottom:'1px solid #1a1a1a', padding:'12px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
                {isMobile && (
                  <button onClick={() => setShowSidebar(true)} style={{ background:'none', border:'none', color:'#ac1ed6', fontSize:'20px', cursor:'pointer', padding:'0 4px' }}>←</button>
                )}
                <Avatar name={selectedUser.name} photo={selectedUser.photo} size={40} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>{selectedUser.name}</div>
                  <div style={{ fontSize:'11px', color:typingUsers[selectedUser.socketId]?'#f97316':'#4ade80' }}>{typingUsers[selectedUser.socketId]?'typing...':'● Active now'}</div>
                </div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
                {currentMessages.length === 0 && (
                  <div style={{ textAlign:'center', marginTop:'60px', animation:'fadeUp 0.6s ease' }}>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:'12px' }}><Avatar name={selectedUser.name} photo={selectedUser.photo} size={64} /></div>
                    <div style={{ fontSize:'16px', fontWeight:600, color:'#fff' }}>{selectedUser.name}</div>
                    <div style={{ fontSize:'13px', color:'#555', marginTop:'4px' }}>Say hello</div>
                  </div>
                )}
                {currentMessages.map((msg, i) => (
                  <div key={i}>
                    {msg.from === 'system' && (
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        <div style={{ background:'#1a1a1a', border:'1px solid #333', color:'#f97316', fontSize:'12px', padding:'7px 14px', borderRadius:'20px', maxWidth:'85%', textAlign:'center' }}>🛡️ {msg.text}</div>
                      </div>
                    )}
                    {msg.from === 'me' && (
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        <div style={{ maxWidth:'65%', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px' }}>
                          <div className='msg-in' style={{ padding:msg.type==='voice'?'8px 14px':'10px 16px', fontSize:'14px', lineHeight:1.5, borderRadius:'20px 20px 4px 20px', background:msg.status==='blocked'?'#2a1a1a':'linear-gradient(135deg,#ac1ed6,#c26e73)', border:msg.status==='blocked'?'1px solid #5a2a2a':'none', color:msg.status==='blocked'?'#f87171':'#fff' }}>
                            {msg.type === 'voice' ? <audio controls src={msg.audioData} style={{ height:32, maxWidth:180 }} /> : msg.text}
                            {msg.status === 'blocked' && <span style={{ marginLeft:'6px', fontSize:'11px' }}>blocked</span>}
                          </div>
                          <div style={{ fontSize:'10px', color:'#444' }}>{formatTime(msg.timestamp)}</div>
                        </div>
                      </div>
                    )}
                    {msg.from === 'them' && (
                      <div style={{ display:'flex', alignItems:'flex-end', gap:'8px' }}>
                        <Avatar name={selectedUser.name} photo={selectedUser.photo} size={28} />
                        <div style={{ maxWidth:'65%', display:'flex', flexDirection:'column', gap:'3px' }}>
                          <div className='msg-in' style={{ padding:msg.type==='voice'?'8px 14px':'10px 16px', fontSize:'14px', lineHeight:1.5, borderRadius:'20px 20px 20px 4px', background:'#221f20', color:'#fff' }}>
                            {msg.type === 'voice' ? <audio controls src={msg.audioData} style={{ height:32, maxWidth:180 }} /> : msg.text}
                          </div>
                          <div style={{ fontSize:'10px', color:'#444' }}>{formatTime(msg.timestamp)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {checking && (
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <div style={{ background:'#221f20', padding:'8px 16px', borderRadius:'20px', fontSize:'12px', color:'#666', animation:'pulse 1.2s ease infinite' }}>✦ checking...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {showEmoji && (
                <div style={{ position:'absolute', bottom:80, right:16, zIndex:100 }}>
                  <EmojiPicker theme='dark' onEmojiClick={(e) => setInput(prev => prev + e.emoji)} height={350} width={300} />
                </div>
              )}
              <div style={{ background:'#0f0d0e', borderTop:'1px solid #1a1a1a', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', position:'relative' }}>
                <button onClick={() => setShowEmoji(!showEmoji)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', lineHeight:1 }}>😊</button>
                <input value={input} onChange={(e) => { setInput(e.target.value); if(selectedUser) socketRef.current.emit('typing', { toSocketId:selectedUser.socketId }); }}
                  onKeyDown={handleKeyDown} className='input-field' placeholder='Message...'
                  style={{ flex:1, background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'24px', padding:'10px 18px', fontSize:'14px', color:'#fff' }} />
                <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                  style={{ background:recording?'linear-gradient(135deg,#ac1ed6,#c26e73)':'#1a1a1a', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', transition:'all 0.2s' }}>🎤</button>
                <button onClick={() => sendMessage()} style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#ac1ed6,#c26e73)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:'#fff' }}>➤</button>
              </div>
            </>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
              <div style={{ textAlign:'center', animation:'fadeUp 0.6s ease' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#ac1ed6,#c26e73)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 16px' }}>✦</div>
                <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', marginBottom:'8px' }}>Wingmann</div>
                <div style={{ color:'#555', fontSize:'14px' }}>Select someone to start chatting</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
