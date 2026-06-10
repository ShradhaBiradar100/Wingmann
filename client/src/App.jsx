import { useState, useEffect } from 'react';
import { auth, provider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import Chat from './Chat';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (err) { console.error('Login error:', err); }
  };

  const handleLogout = async () => { await signOut(auth); setUser(null); };

  if (loading) return (
    <div style={{ height:'100vh', width:'100vw', display:'flex', alignItems:'center', justifyContent:'center', background:'#090607' }}>
      <div style={{ color:'#ac1ed6', fontSize:'16px' }}>Loading Wingmann...</div>
    </div>
  );

  if (!user) return (
    <div style={{ height:'100vh', width:'100vw', display:'flex', alignItems:'center', justifyContent:'center', background:'#090607' }}>
      <div style={{ background:'#221f20', borderRadius:'24px', padding:'48px 40px', display:'flex', flexDirection:'column', alignItems:'center', gap:'20px', width:'320px', border:'1px solid rgba(172,30,214,0.2)' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#ac1ed6,#c26e73)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', color:'#fff' }}>✦</div>
        <div style={{ fontSize:'28px', fontWeight:700, color:'#fff' }}>Wingmann</div>
        <p style={{ color:'#888', textAlign:'center', fontSize:'14px', margin:0, lineHeight:1.6 }}>Connect, chat, and meet at our partnered cafes</p>
        <button onClick={handleGoogleLogin} style={{ display:'flex', alignItems:'center', gap:'12px', background:'#fff', color:'#111', fontWeight:600, padding:'13px 24px', borderRadius:'50px', border:'none', cursor:'pointer', fontSize:'14px', width:'100%', justifyContent:'center' }}>
          <img src='https://www.google.com/favicon.ico' alt='G' style={{ width:18 }} />
          Continue with Google
        </button>
        <p style={{ color:'#555', fontSize:'11px', textAlign:'center', margin:0 }}>Keep conversations here until your first meetup</p>
      </div>
    </div>
  );

  return <Chat user={user} onLogout={handleLogout} />;
}
