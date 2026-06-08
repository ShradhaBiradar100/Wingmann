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

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const socket = io("https://wingmann-server.onrender.com");
    socketRef.current = socket;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    socket.emit("user_join", {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL
    });

    socket.on("users_update", (updatedUsers) => {
      const seen = new Set();
      const others = updatedUsers
        .filter(u => u.uid !== user.uid)
        .filter(u => {
          if (seen.has(u.uid)) return false;
          seen.add(u.uid);
          return true;
        });
      setUsers(others);
    });

    socket.on("message_delivered", (data) => {
      const key = data.toSocketId;
      setMessages(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), {
          text: data.message, from: "me", status: "delivered",
          timestamp: data.timestamp, id: data.tempId
        }]
      }));
      setTyping(false);
    });

    socket.on("message_blocked", (data) => {
      const key = selectedUserRef.current?.socketId;
      setMessages(prev => ({
        ...prev,
        [key]: [...(prev[key] || []),
          { text: data.message, from: "me", status: "blocked", timestamp: new Date().toISOString(), id: data.tempId },
          { text: BLOCKED_MESSAGE, from: "system", timestamp: new Date().toISOString() }
        ]
      }));
      setTyping(false);
    });

    socket.on("receive_message", (data) => {
      const key = data.fromUser.socketId;
      setMessages(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), {
          text: data.message, from: "them", timestamp: data.timestamp
        }]
      }));
      if (selectedUserRef.current?.socketId !== key) {
        setNotifications(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
        if (Notification.permission === "granted") {
          new Notification(`New message from ${data.fromUser.name}`, {
            body: data.message, icon: data.fromUser.photo
          });
        }
      }
    });

    socket.on("user_typing", (data) => {
      setTypingUsers(prev => ({ ...prev, [data.fromSocketId]: true }));
      setTimeout(() => {
        setTypingUsers(prev => ({ ...prev, [data.fromSocketId]: false }));
      }, 2000);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !selectedUser) return;
    const tempId = Date.now().toString();
    setTyping(true);
    socketRef.current.emit("send_message", {
      message: input,
      toSocketId: selectedUser.socketId,
      fromUser: { uid: user.uid, name: user.displayName, photo: user.photoURL, socketId: socketRef.current.id },
      tempId
    });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentMessages = messages[selectedUser?.socketId] || [];

  return (
    <div style={{
      height: "100vh", width: "100vw", display: "flex",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Inter', sans-serif"
    }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes wave {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(20deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: "320px", display: "flex", flexDirection: "column",
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.08)"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <img
                src={user.photoURL} alt="me"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`; }}
                style={{ width: "42px", height: "42px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)" }}
              />
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: "11px", height: "11px", borderRadius: "50%",
                background: "#4ade80", border: "2px solid #764ba2"
              }} />
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>{user.displayName}</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}>● Online</div>
            </div>
          </div>
          <button onClick={onLogout} style={{
            background: "rgba(255,255,255,0.15)", border: "none", color: "white",
            padding: "6px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer"
          }}>Logout</button>
        </div>

        {/* App name */}
        <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>☕</span>
          <span style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>Wingmann</span>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 16px 12px" }}>
          <input type="text" placeholder="🔍  Search users..." style={{
            width: "100%", background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)", color: "white",
            borderRadius: "12px", padding: "10px 16px", fontSize: "13px",
            outline: "none", boxSizing: "border-box"
          }} />
        </div>

        {/* Online label */}
        <div style={{ padding: "4px 20px 8px", color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>
          Online Now — {users.length}
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {users.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>👥</div>
              No other users online.<br />Open another tab to test!
            </div>
          ) : (
            users.map((u) => (
              <div key={u.socketId}
                onClick={() => {
                  setSelectedUser(u);
                  setNotifications(prev => ({ ...prev, [u.socketId]: 0 }));
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px", cursor: "pointer",
                  background: selectedUser?.socketId === u.socketId
                    ? "linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))"
                    : "transparent",
                  borderLeft: selectedUser?.socketId === u.socketId
                    ? "3px solid #667eea" : "3px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ position: "relative" }}>
                  <img src={u.photo} alt={u.name}
                    onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`; }}
                    style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)" }}
                  />
                  <div style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: "11px", height: "11px", borderRadius: "50%",
                    background: "#4ade80", border: "2px solid #302b63"
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>{u.name}</div>
                  <div style={{ color: typingUsers[u.socketId] ? "#fbbf24" : "#4ade80", fontSize: "11px" }}>
                    {typingUsers[u.socketId] ? "✍ typing..." : "● online"}
                  </div>
                </div>
                {notifications[u.socketId] > 0 && (
                  <div style={{
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "white", borderRadius: "50%",
                    width: "20px", height: "20px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700
                  }}>
                    {notifications[u.socketId]}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MAIN CHAT ── */}
      {selectedUser ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Chat header */}
          <div style={{
            padding: "16px 24px",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", gap: "14px"
          }}>
            <div style={{ position: "relative" }}>
              <img src={selectedUser.photo} alt={selectedUser.name}
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`; }}
                style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid rgba(102,126,234,0.6)" }}
              />
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: "11px", height: "11px", borderRadius: "50%",
                background: "#4ade80", border: "2px solid #24243e"
              }} />
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>{selectedUser.name}</div>
              <div style={{ color: typingUsers[selectedUser?.socketId] ? "#fbbf24" : "#4ade80", fontSize: "12px" }}>
                ● {typingUsers[selectedUser?.socketId] ? "typing..." : "Active now"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {currentMessages.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", marginTop: "80px" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>💬</div>
                <div style={{ fontSize: "14px" }}>Say hello to {selectedUser.name}!</div>
              </div>
            )}
            {currentMessages.map((msg, i) => (
              <div key={i}>
                {msg.from === "system" && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                    <div style={{
                      background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)",
                      color: "#fbbf24", fontSize: "12px", padding: "10px 16px",
                      borderRadius: "16px", maxWidth: "380px", textAlign: "center", lineHeight: "1.5"
                    }}>🛡️ {msg.text}</div>
                  </div>
                )}
                {msg.from === "me" && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ maxWidth: "60%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <div style={{
                        padding: "12px 16px", borderRadius: "20px 20px 4px 20px",
                        fontSize: "14px", lineHeight: "1.5",
                        background: msg.status === "blocked" ? "rgba(239,68,68,0.2)" : "linear-gradient(135deg, #667eea, #764ba2)",
                        border: msg.status === "blocked" ? "1px solid rgba(239,68,68,0.5)" : "none",
                        color: msg.status === "blocked" ? "#fca5a5" : "white",
                        boxShadow: msg.status === "blocked" ? "none" : "0 4px 15px rgba(102,126,234,0.3)"
                      }}>
                        {msg.text}
                        {msg.status === "blocked" && <span style={{ marginLeft: "8px", fontSize: "11px" }}>⚠ blocked</span>}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px" }}>{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                )}
                {msg.from === "them" && (
                  <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: "8px" }}>
                    <img src={selectedUser.photo} alt={selectedUser.name}
                      onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`; }}
                      style={{ width: "28px", height: "28px", borderRadius: "50%" }}
                    />
                    <div style={{ maxWidth: "60%", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{
                        padding: "12px 16px", borderRadius: "20px 20px 20px 4px",
                        fontSize: "14px", lineHeight: "1.5",
                        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.08)", color: "white"
                      }}>{msg.text}</div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px" }}>{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  background: "rgba(102,126,234,0.2)", border: "1px solid rgba(102,126,234,0.3)",
                  color: "rgba(255,255,255,0.5)", padding: "8px 16px",
                  borderRadius: "20px", fontSize: "12px"
                }}>Checking message... ✦</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "16px 24px",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", gap: "12px"
          }}>
            <input type="text" value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (selectedUser) {
                  socketRef.current.emit("typing", { toSocketId: selectedUser.socketId, fromName: user.displayName });
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)", color: "white",
                borderRadius: "24px", padding: "12px 20px", fontSize: "14px", outline: "none"
              }}
            />
            <button onClick={sendMessage} style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              border: "none", color: "white", padding: "12px 24px",
              borderRadius: "24px", fontSize: "14px", fontWeight: 600,
              cursor: "pointer", boxShadow: "0 4px 15px rgba(102,126,234,0.4)"
            }}>Send ➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
          {showWelcome ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center", animation: "fadeInUp 0.8s ease forwards" }}>
              <div style={{ position: "relative", animation: "float 3s ease-in-out infinite" }}>
                <img src={user.photoURL} alt="me"
                  onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`; }}
                  style={{ width: "90px", height: "90px", borderRadius: "50%", border: "3px solid rgba(102,126,234,0.6)", boxShadow: "0 0 30px rgba(102,126,234,0.4)" }}
                />
                <div style={{ position: "absolute", bottom: "-4px", right: "-4px", fontSize: "28px", animation: "wave 1s ease-in-out 0.5s 3" }}>👋</div>
              </div>
              <div>
                <div style={{ color: "white", fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
                  Hey, {user.displayName.split(" ")[0]}! 👋
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: "1.6" }}>
                  You're now online on Wingmann ☕<br />Pick someone to chat with!
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                {["#667eea", "#764ba2", "#f093fb"].map((color, i) => (
                  <div key={i} style={{
                    width: "8px", height: "8px", borderRadius: "50%", background: color,
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px",
              padding: "48px 64px", textAlign: "center", animation: "fadeInUp 0.6s ease forwards"
            }}>
              <div style={{ fontSize: "64px", marginBottom: "16px", animation: "float 3s ease-in-out infinite" }}>☕</div>
              <div style={{ color: "white", fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Welcome to Wingmann</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Select someone from the sidebar to start chatting</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}