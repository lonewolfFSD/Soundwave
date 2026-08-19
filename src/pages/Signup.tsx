import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  updateProfile, 
  sendEmailVerification,
  signOut 
} from 'firebase/auth';
import { auth } from '../utils/firebase';
import Background from '../images/background.jpeg';
import { Eye, EyeOff, Mail } from 'lucide-react'; 
import Logo from '../images/logo.png';

import { doc, setDoc } from 'firebase/firestore';
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

const googleProvider = new GoogleAuthProvider();

const Signup = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (username.trim().length === 0) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: username
      });

      // 🟢 THE MISSING PIECE: Create their database profile instantly!
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: username,
        email: email,
        isBanned: false, // The field you wanted
        tag: 'Standard',
        createdAt: new Date().toISOString()
      });

      await sendEmailVerification(userCredential.user);
      await signOut(auth);

      setShowSuccessModal(true);
      
      let timer = 5;
      const interval = setInterval(() => {
        timer -= 1;
        setCountdown(timer);
        if (timer === 0) {
          clearInterval(interval);
          navigate('/login');
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      setLoading(false); 
    }
  };

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    // Added overflow-x-hidden to completely prevent horizontal scrolling
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative md:p-6 selection:bg-indigo-500/30 overflow-x-hidden w-full">
      
      {/* --- SUCCESS MODAL --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="mx-auto w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center mb-6">
              <Mail className="w-6 h-6 text-green-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk" }}>Verify your Email</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              We've sent a verification link to <span className="text-white font-medium">{email}</span>. <br/>
              Please check your inbox to activate your account.
            </p>

            <div className="w-full bg-white/5 rounded-full h-1 mb-4 overflow-hidden">
               <div className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" style={{ width: `${(10 - countdown) * 20}%` }}></div>
            </div>

            <p className="text-xs text-zinc-500" style={{ fontFamily: "Space Grotesk" }}>Redirecting to login in {countdown}s...</p>
          </div>
        </div>
      )}

      <HeroGrid />

      {/* Background Mesh Glows */}
      <span className='hidden md:flex'>
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      </span>

      <div className="w-full md:max-w-[420px] relative z-10 group">
        {/* Tight Glow Border */}
        <div className="absolute -inset-[1px] md:bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-2xl blur-[2px] opacity-50"></div>
        
        <div className="relative backdrop-blur-md bg-black/60 md:border md:border-white/10 md:rounded-[36px] overflow-hidden shadow-2xl">
          <div className="flex flex-col md:flex-row">
            
            {/* Left: Image section */}
            

            {/* Right: Form section */}
            <div className="w-full  p-10 md:p-10 flex flex-col justify-center bg-zinc-950/40">
              <div className="flex hidden md:flex flex-col items-end text-left"> {/* Ensures everything aligns to the full left */}
  <span className="block">
    <img 
      src={Logo} 
      className="w-32 h-32 -mt-6 -mb-[90px]  object-cover -mr-12" 
      alt="SoundWave Logo" 
    />
  </span>
  </div>
  <div className="flex hidden md:flex-col items-end text-left"> {/* Corrected space in md:flex-col */}
  <span className="block">
    <img 
      src={Logo} 
      className="w-32 h-32 -mt-6 -mb-[90px]  object-cover -mr-12" 
      alt="SoundWave Logo" 
    />
  </span>
  </div>
  <div className="mb-6 md:hidden text-center md:text-left">
                  <span className=''>
                  <img src={Logo} className='w-36 h-36 -mt-20 -mb-6 m-auto ' />
                </span>
                </div>
  <h1 
    className="text-2xl font-bold text-white tracking-tight" 
    style={{ fontFamily: 'Space Grotesk' }}
  >
    Create an account
  </h1>
  <p className="text-zinc-500 text-xs mt-1 mb-4" style={{ fontFamily: "Space Grotesk" }}>Join SoundWave to start your journey.</p>

              <form onSubmit={handleSubmit} className="space-y-2">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700"
                    placeholder="johndoe"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700"
                    placeholder="you@email.com"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <div className="space-y-1.5 w-1/2 relative">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 w-1/2 relative">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">Confirm</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-[11px] text-red-400 bg-red-400/5 border border-red-400/20 py-2 px-3 rounded-lg animate-shake">
                    {error}
                  </div>
                )}

                <br />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Space Grotesk' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  ) : 'Sign Up'}
                </button>
              </form>



             

              <p className="mt-6 text-center text-[12px] text-zinc-500" style={{ fontFamily: "Space Grotesk" }}>
                Already have an account?{' '}
                <Link to="/login" className="text-white hover:text-indigo-400 font-bold transition underline">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Signup;