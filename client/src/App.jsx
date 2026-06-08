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
      <div style={{
        height: "100vh", width: "100vw", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
      }}>
        <div style={{ color: "white", fontSize: "18px" }}>Loading Wingmann... ☕</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        height: "100vh", width: "100vw", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px", padding: "48px",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: "20px", width: "360px"
        }}>
          <div style={{ fontSize: "56px" }}>☕</div>
          <h1 style={{ color: "white", fontSize: "32px", fontWeight: 800, margin: 0 }}>Wingmann</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
            Connect, chat, and meet at our partnered cafes
          </p>
          <button
            onClick={handleGoogleLogin}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              background: "white", color: "#333", fontWeight: 600,
              padding: "14px 24px", borderRadius: "50px", border: "none",
              cursor: "pointer", fontSize: "15px", width: "100%",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
            }}
          >
            <img src="https://www.google.com/favicon.ico" alt="G" style={{ width: "20px" }} />
            Continue with Google
          </button>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", textAlign: "center", margin: 0 }}>
            Keep conversations on platform until your first meetup ☕
          </p>
        </div>
      </div>
    );
  }

  return <Chat user={user} onLogout={handleLogout} />;
}