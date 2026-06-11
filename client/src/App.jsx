import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "./firebase";
import LandingPage from "./LandingPage";
import Chat from "./Chat";

export default function App() {
  const [stage, setStage] = useState("landing");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setStage("chat"); }
      else { setUser(null); setStage("landing"); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      setStage("chat");
    } catch (e) { console.error("Login failed:", e); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setStage("landing");
  };

  if (loading) return (
    <div style={{ height:"100vh", width:"100vw", display:"flex", alignItems:"center", justifyContent:"center", background:"#090607", flexDirection:"column", gap:"24px", fontFamily:"'Epilogue',sans-serif" }}>
      <div style={{ width:56, height:56, borderRadius:"12px", background:"#6b21a8", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="32" height="22" viewBox="0 0 60 40" fill="none"><path d="M5 35 Q15 5 20 20 Q25 35 30 20 Q35 5 40 20 Q45 35 55 5" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none"/></svg>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"22px", fontWeight:700, color:"#fff", marginBottom:"8px" }}>Wingmann</div>
        <div style={{ fontSize:"13px", color:"#555" }}>Loading...</div>
      </div>
    </div>
  );

  if (stage === "landing") return <LandingPage onEnter={handleLogin} />;
  return <Chat user={user} onLogout={handleLogout} />;
}
