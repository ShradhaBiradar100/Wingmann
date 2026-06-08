import { useState, useEffect } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import Chat from "./Chat";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 40%, #e8eaf6 100%)" }}>
        <div style={{ color: "#ce93d8", fontSize: "18px" }}>Loading Wingmann... ☕</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 40%, #e8eaf6 100%)", fontFamily: "'Inter', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@1&display=swap');`}</style>
        <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", border: "0.5px solid rgba(244,143,177,0.3)", borderRadius: "28px", padding: "48px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "340px" }}>
          <div style={{ fontSize: "52px" }}>☕</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: "34px", color: "#7b3f9e" }}>
            Wingmann<span style={{ color: "#f48fb1" }}>.</span>
          </div>
          <p style={{ color: "#d4a0e0", textAlign: "center", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
            Connect, chat, and meet at our partnered cafes 💕
          </p>
          <button onClick={handleGoogleLogin} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fff", color: "#4a1060", fontWeight: 500, padding: "13px 24px", borderRadius: "50px", border: "0.5px solid rgba(244,143,177,0.4)", cursor: "pointer", fontSize: "15px", width: "100%", justifyContent: "center" }}>
            <img src="https://www.google.com/favicon.ico" alt="G" style={{ width: "18px" }} />
            Continue with Google
          </button>
          <p style={{ color: "#e0b0f0", fontSize: "11px", textAlign: "center", margin: 0 }}>
            Keep conversations here until your first meetup ☕
          </p>
        </div>
      </div>
    );
  }

  return <Chat user={user} onLogout={handleLogout} />;
}