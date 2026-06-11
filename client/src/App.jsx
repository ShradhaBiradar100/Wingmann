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

  const handleLogin = () => setStage("login");

  const handleGoogleLogin = async () => {
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

  if (stage === "login") return (
    <div style={{ height:"100vh", width:"100vw", display:"flex", alignItems:"center", justifyContent:"center", background:"#090607", fontFamily:"'Epilogue',sans-serif" }}>
      <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:"24px" }}>
        <div style={{ width:56, height:56, borderRadius:"12px", background:"#6b21a8", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="32" height="22" viewBox="0 0 60 40" fill="none"><path d="M5 35 Q15 5 20 20 Q25 35 30 20 Q35 5 40 20 Q45 35 55 5" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none"/></svg>
        </div>
        <div>
          <div style={{ fontSize:"24px", fontWeight:700, color:"#fff", marginBottom:"8px" }}>Join Wingmann</div>
          <div style={{ fontSize:"14px", color:"#555" }}>Sign in to start chatting</div>
        </div>
        <button onClick={handleGoogleLogin} style={{ display:"flex", alignItems:"center", gap:"12px", background:"#fff", color:"#111", border:"none", borderRadius:"12px", padding:"14px 28px", fontSize:"15px", fontWeight:500, cursor:"pointer" }}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>
        <button onClick={() => setStage("landing")} style={{ background:"none", border:"none", color:"#444", fontSize:"13px", cursor:"pointer" }}>← Back to home</button>
      </div>
    </div>
  );
  return <Chat user={user} onLogout={handleLogout} />;
}
