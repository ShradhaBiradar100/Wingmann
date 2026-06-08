import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const BLOCKED_MESSAGE = "To keep things safe and simple, let's keep the chat here until you're ready to meet at one of our great partnered spots! ☕";

export default function Chat({ user, onLogout }) {
  const socketRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [notifications, setNotifications] = useState({});
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(selectedUser);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  useEffect(() => { const t = setTimeout(() => setShowWelcome(false), 4000); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const socket = io("https://wingmann-server.onrender.com");
    socketRef.current = socket;
    if (Notification.permission === "default") Notification.requestPermission();
    socket.emit("user_join", { uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL });

    socket.on("users_update", (updatedUsers) => {
      const seen = new Set();
      setUsers(updatedUsers.filter(u => u.uid !== user.uid).filter(u => { if (seen.has(u.uid)) return false; seen.add(u.uid); return true; }));
    });
    socket.on("message_delivered", (data) => {
      setMessages(prev => ({ ...prev, [data.toSocketId]: [...(prev[data.toSocketId] || []), { text: data.message, from: "me", status: "delivered", timestamp: data.timestamp, id: data.tempId }] }));
      setTyping(false);
    });
    socket.on("message_blocked", (data) => {
      const key = selectedUserRef.current?.socketId;
      setMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), { text: data.message, from: "me", status: "blocked", timestamp: new Date().toISOString(), id: data.tempId }, { text: BLOCKED_MESSAGE, from: "system", timestamp: new Date().toISOString() }] }));
      setTyping(false);
    });
    socket.on("receive_message", (data) => {
      const key = data.fromUser.socketId;
      setMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), { text: data.message, from: "them", timestamp: data.timestamp }] }));
      if (selectedUserRef.current?.socketId !== key) {
        setNotifications(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
        if (Notification.permission === "granted") new Notification(`New message from ${data.fromUser.name}`, { body: data.message, icon: data.fromUser.photo });
      }
    });
    socket.on("user_typing", (data) => {
      setTypingUsers(prev => ({ ...prev, [data.fromSocketId]: true }));
      setTimeout(() => setTypingUsers(prev => ({ ...prev, [data.fromSocketId]: false })), 2000);
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !selectedUser) return;
    const tempId = Date.now().toString();
    setTyping(true);
    socketRef.current.emit("send_message", { message: input, toSocketId: selectedUser.socketId, fromUser: { uid: user.uid, name: user.displayName, photo: user.photoURL, socketId: socketRef.current.id }, tempId });
    setInput("");
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const currentMessages = messages[selectedUser?.socketId] || [];

  const Avatar = ({ name, photo, size = 36 }) => (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: -2, borderRadius: "50%", background: "conic-gradient(#f48fb1, #ce93d8, #9fa8da, #f48fb1)" }} />
      <div style={{ position: "absolute", inset: 1, borderRadius: "50%", background: "#fff" }} />
      <img src={photo} alt={name}
        onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`; }}
        style={{ position: "absolute", inset: 2, borderRadius: "50%", width: size - 4, height: size - 4, objectFit: "cover" }} />
    </div>
  );

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", background: "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 40%, #e8eaf6 100%)", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@1&display=swap');
        @keyframes popIn { from { transform: scale(0.8); opacity:0; } to { transform: scale(1); opacity:1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes wave { 0%{transform:rotate(0)} 25%{transform:rotate(20deg)} 50%{transform:rotate(0)} 75%{transform:rotate(20deg)} 100%{transform:rotate(0)} }
        .msg-bubble { animation: popIn 0.25s ease; }
        .send-btn-anim { animation: pulse 2s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #f0c0d8; border-radius: 4px; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width: "280px", display: "flex", flexDirection: "column", flexShrink: 0, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", borderRight: "0.5px solid rgba(244,143,177,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 14px", borderBottom: "0.5px solid rgba(244,143,177,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: "26px", color: "#7b3f9e", letterSpacing: "0.5px" }}>
              Wingmann<span style={{ color: "#f48fb1" }}>.</span>
            </span>
            <button onClick={onLogout} style={{ fontSize: "11px", color: "#ce93d8", background: "rgba(255,255,255,0.6)", border: "0.5px solid #f0c0d8", borderRadius: "20px", padding: "4px 10px", cursor: "pointer" }}>logout</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <Avatar name={user.displayName} photo={user.photoURL} size={34} />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#4a1060" }}>{user.displayName}</div>
              <div style={{ fontSize: "11px", color: "#66bb6a" }}>● Online</div>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "20px", padding: "7px 14px", fontSize: "12px", color: "#d4a0e0", display: "flex", alignItems: "center", gap: "6px", border: "0.5px solid #f0c0d8" }}>
            🔍 Search
          </div>
        </div>

        <div style={{ padding: "8px 16px 4px", fontSize: "10px", color: "#d4a0e0", letterSpacing: "1px", textTransform: "uppercase" }}>
          Messages · {users.length}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {users.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#d4a0e0", fontSize: "13px" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>👥</div>
              No one online yet!<br />Open another tab 💕
            </div>
          ) : users.map((u) => (
            <div key={u.socketId}
              onClick={() => { setSelectedUser(u); setNotifications(prev => ({ ...prev, [u.socketId]: 0 })); }}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", background: selectedUser?.socketId === u.socketId ? "rgba(255,255,255,0.7)" : "transparent", borderLeft: selectedUser?.socketId === u.socketId ? "3px solid #f48fb1" : "3px solid transparent", transition: "all 0.15s", margin: "2px 0" }}>
              <Avatar name={u.name} photo={u.photo} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#4a1060" }}>{u.name}</div>
                <div style={{ fontSize: "11px", color: typingUsers[u.socketId] ? "#f97316" : "#66bb6a" }}>
                  {typingUsers[u.socketId] ? "✍️ typing..." : "● active now"}
                </div>
              </div>
              {notifications[u.socketId] > 0 && (
                <div style={{ background: "linear-gradient(135deg, #f48fb1, #ce93d8)", color: "#fff", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500 }}>
                  {notifications[u.socketId]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT */}
      {selectedUser ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", borderBottom: "0.5px solid rgba(244,143,177,0.2)", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Avatar name={selectedUser.name} photo={selectedUser.photo} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#4a1060" }}>{selectedUser.name}</div>
              <div style={{ fontSize: "12px", color: typingUsers[selectedUser?.socketId] ? "#f97316" : "#66bb6a" }}>
                {typingUsers[selectedUser?.socketId] ? "✍️ typing..." : "● Active now"}
              </div>
            </div>
            <span style={{ fontSize: "20px", cursor: "pointer" }}>📞</span>
            <span style={{ fontSize: "20px", cursor: "pointer", marginLeft: "8px" }}>🎥</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {currentMessages.length === 0 && (
              <div style={{ textAlign: "center", marginTop: "60px", animation: "fadeUp 0.6s ease" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                  <Avatar name={selectedUser.name} photo={selectedUser.photo} size={70} />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 500, color: "#4a1060" }}>{selectedUser.name}</div>
                <div style={{ fontSize: "13px", color: "#d4a0e0", marginTop: "4px" }}>
                  Say hello! <span style={{ display: "inline-block", animation: "wave 1s ease-in-out 0.5s 3" }}>👋</span>
                </div>
              </div>
            )}

            {currentMessages.map((msg, i) => (
              <div key={i}>
                {msg.from === "system" && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                    <div style={{ background: "rgba(255,255,255,0.7)", border: "0.5px solid #ffcc80", color: "#e65100", fontSize: "12px", padding: "7px 14px", borderRadius: "20px", maxWidth: "85%", textAlign: "center" }}>
                      🛡️ {msg.text}
                    </div>
                  </div>
                )}
                {msg.from === "me" && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                      <div className="msg-bubble" style={{ padding: "10px 16px", fontSize: "14px", lineHeight: 1.4, borderRadius: "20px 20px 4px 20px", background: msg.status === "blocked" ? "rgba(255,235,238,0.9)" : "linear-gradient(135deg, #f48fb1, #ce93d8)", border: msg.status === "blocked" ? "1px solid #f48fb1" : "none", color: msg.status === "blocked" ? "#c62828" : "#fff" }}>
                        {msg.text}
                        {msg.status === "blocked" && <span style={{ marginLeft: "6px", fontSize: "11px" }}>⚠️ blocked</span>}
                      </div>
                      <div style={{ fontSize: "10px", color: "#d4a0e0" }}>{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                )}
                {msg.from === "them" && (
                  <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: "8px" }}>
                    <Avatar name={selectedUser.name} photo={selectedUser.photo} size={28} />
                    <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div className="msg-bubble" style={{ padding: "10px 16px", fontSize: "14px", lineHeight: 1.4, borderRadius: "20px 20px 20px 4px", background: "rgba(255,255,255,0.85)", border: "0.5px solid rgba(244,143,177,0.3)", color: "#4a1060" }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: "10px", color: "#d4a0e0" }}>{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "rgba(255,255,255,0.7)", border: "0.5px solid #f0c0d8", padding: "8px 16px", borderRadius: "20px", fontSize: "12px", color: "#ce93d8" }}>
                  ✦ checking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", borderTop: "0.5px solid rgba(244,143,177,0.2)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px", cursor: "pointer" }}>😊</span>
            <input value={input}
              onChange={(e) => { setInput(e.target.value); if (selectedUser) socketRef.current.emit("typing", { toSocketId: selectedUser.socketId }); }}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              style={{ flex: 1, background: "rgba(255,255,255,0.7)", border: "0.5px solid rgba(244,143,177,0.4)", borderRadius: "24px", padding: "10px 18px", fontSize: "14px", outline: "none", color: "#4a1060" }}
            />
            <span style={{ fontSize: "22px", cursor: "pointer" }}>🎤</span>
            <button onClick={sendMessage} className="send-btn-anim"
              style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #f48fb1, #ce93d8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#fff" }}>
              ➤
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
          {showWelcome ? (
            <div style={{ textAlign: "center", animation: "fadeUp 0.8s ease" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <div style={{ position: "relative", animation: "float 3s ease-in-out infinite" }}>
                  <Avatar name={user.displayName} photo={user.photoURL} size={90} />
                  <div style={{ position: "absolute", bottom: -4, right: -4, fontSize: "28px", animation: "wave 1s ease-in-out 0.5s 3" }}>👋</div>
                </div>
              </div>
              <div style={{ fontSize: "26px", fontWeight: 500, color: "#4a1060", marginBottom: "8px" }}>
                Hey, {user.displayName.split(" ")[0]}! 💕
              </div>
              <div style={{ color: "#d4a0e0", fontSize: "14px", lineHeight: 1.6 }}>
                You're on Wingmann ☕<br />Pick someone to chat with!
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px" }}>
                {["#f48fb1", "#ce93d8", "#9fa8da"].map((c, i) => (
                  <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: c, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", border: "0.5px solid rgba(244,143,177,0.3)", borderRadius: "24px", padding: "48px 64px", textAlign: "center", animation: "fadeUp 0.6s ease" }}>
              <div style={{ fontSize: "56px", marginBottom: "12px", animation: "float 3s ease-in-out infinite" }}>☕</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: "28px", color: "#7b3f9e", marginBottom: "8px" }}>Wingmann.</div>
              <div style={{ color: "#d4a0e0", fontSize: "14px" }}>Select someone to start chatting 💕</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}