import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import { 
  signInWithEmailAndPassword, 
  signInWithRedirect,
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  getRedirectResult
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const ALBUM_COVERS = [
  "https://imgs.search.brave.com/0wk7hQ4vHgYE1N71XD8KQH0O6JPM-no28QVJs7y0_-Q/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/NDFMZHVTUGNZa0wu/anBn",
  "https://imgs.search.brave.com/zFcX12oApb1EVJKy286I9SvxTU2KvC1ht-TMF-qLxHE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLmRp/c2NvZ3MuY29tL3FP/b1duRDFEd21iRHpZ/enJjS0ZmblFfMnBK/cWQtQ0xWSlRfbHJU/SDhPT00vcnM6Zml0/L2c6c20vcTo0MC9o/OjMwMC93OjMwMC9j/ek02THk5a2FYTmpi/MmR6L0xXUmhkR0Zp/WVhObExXbHQvWVdk/bGN5OVNMVEUyTVRN/MS9ORFkyTFRFMk1E/UXdNelE0L09URXRP/VFUzTWk1cWNHVm4u/anBlZw",
  "https://imgs.search.brave.com/zGALGHMufkzZDj738fUTDPHqVSCwcJh9P9pl1-9FeX4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS50aGVjcmltc29u/LmNvbS9waG90b3Mv/MjAxOS8xMC8yOC8y/MzMwMjlfMTM0MDM4/MC5qcGc",
  "https://imgs.search.brave.com/pqWZec7XwRlgehSUiC-AeXx1AE8FRv2lOspGm05q5XU/rs:fit:200:200:1:0/g:ce/aHR0cHM6Ly9pLnNj/ZG4uY28vaW1hZ2Uv/YWI2NzYxNmQwMDAw/YjI3M2VjN2FlYmVm/MWI4YzE2MjJlMzVi/YWJmNg",
  "https://imgs.search.brave.com/lF3wRc0vh8ww1i24lAQHq3kMR0OKqgQeGCMNMXbrnAM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzFkLzgx/LzRkLzFkODE0ZDc5/ZGY2NTllMTM5Mjcy/NDMyMTc1MmZjNzJi/LmpwZw",
  "https://imgs.search.brave.com/qTCD7BLbRIVivOU9WWQTS6CbJPzJroyrnRXQtd4pO0I/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJjYXZlLmNv/bS93cC93cDEyNjQ1/MjMyLmpwZw",
  "https://imgs.search.brave.com/xSgVTGfLHjAn_vrpuBH_K-FlmzLW_QAobpW9XwZ4TA8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzRiLzRk/LzAwLzRiNGQwMDlh/NjdjNDhkZjYzMDBj/MzM3MTY3YzI0MGNi/LmpwZw",
  "https://i.pinimg.com/736x/28/7a/31/287a31728dd2d5db55bfc765e22fc320.jpg",
  "https://i.pinimg.com/736x/78/60/97/7860974a742b2214cc17587c15e52097.jpg",
  "https://i.pinimg.com/736x/0f/4b/aa/0f4baaa45bceb12c01c8c7015f0c6708.jpg",
  "https://i.pinimg.com/736x/fd/1b/51/fd1b5187b2430642823e5f4a9212e00d.jpg",
  "https://i.pinimg.com/736x/30/80/b8/3080b84dbe0d8b894ddc6413092134eb.jpg",
  "https://i.pinimg.com/1200x/17/55/bf/1755bf2f6f84f8e6d6a041e78afc0564.jpg",
  "https://i.pinimg.com/736x/30/05/1f/30051f2cb3d27d425f646d010e1e19df.jpg",
  "https://i.pinimg.com/736x/9a/de/7a/9ade7ace43cd664ed7e39987b575bd74.jpg",
  "https://i.pinimg.com/1200x/dd/47/2e/dd472e5314ca93ac4d652d909d82a8d6.jpg",
  "https://i.pinimg.com/736x/8b/df/36/8bdf36725b728bc2dd03dd773c46c3ec.jpg",
  "https://i.pinimg.com/736x/a3/67/04/a367046f9259229415161584f69ab88c.jpg",
  "https://i.pinimg.com/736x/c0/de/4f/c0de4f297459f34e4fd7380c7cf28507.jpg",
  "https://i.pinimg.com/736x/65/ec/f8/65ecf8ba6298402ee8f7e315492e0e1d.jpg",
  "https://i.pinimg.com/736x/c4/73/d5/c473d53b67385a586d23464339ca6ebd.jpg",
  "https://i.pinimg.com/736x/f8/e5/36/f8e536ed7f0119aacde71310c728e147.jpg",
  "https://i.pinimg.com/736x/4a/64/b4/4a64b459ea7b2f590b0dd44b3325462d.jpg",
  "https://i.pinimg.com/736x/01/a7/8a/01a78a5578e3b03187fccd60a5086422.jpg",
  "https://i.pinimg.com/736x/31/38/98/313898f3ae4212e787ed6d4affc70b7c.jpg",
  "https://i.pinimg.com/736x/45/76/a8/4576a899740055654533aea36dc0a74f.jpg",
  "https://i.pinimg.com/736x/39/c2/ca/39c2cad731b729a31cce4bcd16804a8f.jpg",
  "https://i.pinimg.com/736x/9e/ca/51/9eca5182f0e55564a6ffb2e7a5201414.jpg",
  "https://i.pinimg.com/736x/14/44/33/14443358f95a715486b9d2317fb48188.jpg",
  "https://i.pinimg.com/1200x/71/7e/c5/717ec53cdfa4ee513bed1e25d23a27e5.jpg",
  "https://i.pinimg.com/1200x/01/43/28/0143283ca634b3da866fbb932040c8f4.jpg",
  "https://i.pinimg.com/1200x/4d/06/b3/4d06b3eabebada3de2e72308290164b9.jpg",
  "https://i.pinimg.com/736x/35/18/c6/3518c6acd6b97ae704c200ce3ddff685.jpg"
];

import { auth } from '../utils/firebase';
import Logo from '../images/logo.png';

const HeroGrid = () => {
    const numCells = 48; 
    const [cells, setCells] = useState<{url: string | null, visible: boolean}[]>(
      Array.from({ length: numCells }, () => ({ url: null, visible: false }))
    );
  
    useEffect(() => {
      const interval = setInterval(() => {
        setCells(prev => {
          const next = [...prev];
          const randomIdx = Math.floor(Math.random() * numCells);
          
          if (!next[randomIdx].visible) {
            next[randomIdx] = {
              url: ALBUM_COVERS[Math.floor(Math.random() * ALBUM_COVERS.length)],
              visible: true
            };
            
            setTimeout(() => {
              setCells(current => {
                const updated = [...current];
                updated[randomIdx] = { ...updated[randomIdx], visible: false };
                return updated;
              });
            }, 3000); 
          }
          return next;
        });
      }, 450); 
  
      return () => clearInterval(interval);
    }, []);


    return (
      // Changed to fixed so it doesn't overflow the document bounds
      <div className="fixed inset-[-5%] z-0 overflow-hidden pointer-events-none opacity-80">
        <div className="w-full h-full grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-9 grid-rows-4">
          {cells.map((cell, i) => (
            <div 
              key={i} 
              className="w-full h-full border-[0.5px] border-white/5 bg-white/[0.01] relative overflow-hidden"
            >
              <div 
                className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out"
                style={{
                  backgroundImage: cell.url ? `url(${cell.url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: cell.visible ? 1 : 0,
                  filter: 'grayscale(20%) contrast(1.1) brightness(0.7)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent opacity-20" />
            </div>
          ))}
        </div>
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#030303_80%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303]" />
      </div>
    )
  }

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' }); 

// Inside Login.tsx

// MOVE THIS OUTSIDE THE LOGIN COMPONENT
const ensureUserInFirestore = async (user: any) => {
  if (!user) return;
  console.log("🔥 STEP 1: function called for", user.email);
  
  try {
    const userRef = doc(db, 'users', user.uid);
    console.log("🔥 STEP 2: userRef created");

    // Using setDoc with { merge: true } is safer than getDoc + setDoc
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || 'New User',
      email: user.email,
      isBanned: false,
      tag: 'Standard',
      fcmToken: '',
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("🔥 STEP 3: WRITTEN TO FIRESTORE SUCCESS");
  } catch (error) {
    console.error("❌ STEP 4: FIRESTORE SYNC ERROR:", error);
  }
};


const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
  let isMounted = true;

  const unsubscribe = onAuthStateChanged(auth, async (user) => { // 🟢 Added async
    if (user) {
      // 🟢 SYNC HERE: This catches standard email logins and persistent sessions
      await ensureUserInFirestore(user); 
      if (isMounted) navigate('/dashboard');
    } else {
      // This catches the moment someone returns from the Google Redirect
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            // 🟢 SYNC HERE: This catches the fresh Google login
            await ensureUserInFirestore(result.user);
            if (isMounted) navigate('/dashboard');
          } else {
            if (isMounted) setCheckingAuth(false);
          }
        })
        .catch((err) => {
          console.error("Auth Error:", err);
          if (err.code !== 'auth/no-current-user') {
            if (isMounted) setError("Sign-in failed. Check your connection.");
          }
          if (isMounted) setCheckingAuth(false);
        });
    }
  });

  return () => { isMounted = false; unsubscribe(); };
}, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserInFirestore(userCredential.user); // 🟢 Added Sync
    } catch (err: any) {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        let result: any;
        try {
          result = await FirebaseAuthentication.signInWithGoogle({
            useCredentialManager: true
          });
        } catch (credErr: any) {
          console.warn("CredentialManager failed, falling back to classic Google Sign-In:", credErr);
          result = await FirebaseAuthentication.signInWithGoogle({
            useCredentialManager: false
          });
        }

        if (result?.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          const userCredential = await signInWithCredential(auth, credential);
          await ensureUserInFirestore(userCredential.user);
        } else if (result?.user) {
          await ensureUserInFirestore(result.user as any);
        }
        navigate('/dashboard');
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserInFirestore(result.user);
        navigate('/dashboard'); 
      }
    } catch (err: any) {
      console.error("Auth failed:", err);
      setError(err?.message || 'Google Sign-In failed.');
      setGoogleLoading(false);
    }
  };

  if (checkingAuth) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative selection:bg-indigo-500/30 overflow-hidden">
      <HeroGrid />

      
      <span className='hidden md:flex'>
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      </span>

      <div className="w-full max-w-md md:max-w-[420px] relative z-10 group">
        <div className="absolute -inset-[1px] md:bg-gradient-to-r from-white/5 via-white/20 to-white/5 rounded-[24px] blur-sm opacity-50 transition duration-1000 group-hover:opacity-100"></div>
        <div className="relative backdrop-blur-md bg-black/60 md:border md:border-white/10 md:rounded-[34px] overflow-hidden shadow-2xl">
          <div className="w-full p-10 md:p-10 flex flex-col justify-center bg-zinc-950/50">
            
            <div className="flex hidden md:flex flex-col items-end text-left"> 
              <img src={Logo} className="w-32 h-32 -mt-6 -mb-[90px] object-cover -mr-8" alt="Logo" />
            </div>
            <div className="mb-6 md:hidden text-center">
              <img src={Logo} className='w-36 h-36 -mt-14 -mb-6 m-auto' alt="Logo" />
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Welcome back</h1>
            <p className="text-zinc-500 text-xs mt-1 mb-6" style={{ fontFamily: "Space Grotesk" }}>Please enter your details to sign in.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Password</label>
                  <button type="button" className="text-[10px] text-zinc-500 hover:text-white transition">Forgot password?</button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 py-3 px-4 rounded-xl animate-shake">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-white text-black text-[14px] font-bold rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontFamily: "Space Grotesk" }}
              >
                {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> : 'Sign In'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.2em]"><span className="px-4 bg-[#0a0a0a] text-zinc-600">Or continue with</span></div>
            </div>

            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-4 border border-white/10 bg-white/[0.02] text-white font-medium rounded-xl hover:bg-white/[0.05] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" opacity="0.6" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" opacity="0.6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" opacity="0.6" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm">Google</span>
                  </>
                )}
              </button>
            
            <div className="mt-6 text-center">
              <p className="text-zinc-500 text-[11.5px]" style={{ fontFamily: "Space Grotesk" }}>
                Don't have an account? <Link to="/signup" className="text-white hover:text-indigo-400 font-bold transition underline">Sign up</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Login;