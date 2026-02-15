import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../utils/firebase';
import Background from '../images/background.jpeg';

const googleProvider = new GoogleAuthProvider();

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-950 overflow-hidden relative p-4">
      {/* Animated background blobs – exact match */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-blob-slow"></div>
      </div>

      <div className="w-[420px] md:w-full max-w-4xl relative z-10">
        <div className="backdrop-blur-xl bg-black/40 border border-white/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 animate-fade-in-up-scale">
          <div className="flex flex-col md:flex-row h-full">
            {/* Left: Image section */}
            <div className="hidden md:block md:w-1/2 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/50"></div>
              <img
                src={Background}
                alt="Abstract neon sound waves visualization"
                className="absolute inset-0 w-full h-full object-cover opacity-70 animate-slow-pulse"
              />
              <div className="absolute inset-0 flex flex-col items-start justify-end p-8 md:p-12">
                <h2
                  className="text-4xl font-black text-white/90 tracking-tight drop-shadow-2xl animate-pulse-slow"
                  style={{ fontFamily: 'Cabin' }}
                >
                  SoundWave
                </h2>
                <p style={{
                  fontFamily: "Space Grotesk, sans-serif"
                }} className="mt-3 text-base text-white/70 font-light max-w-xs drop-shadow-md">
                  Your music, your way. Log in and dive in.
                </p>
              </div>
            </div>

            {/* Right: Form section */}
            <div className="w-full md:w-1/2 px-8 py-14 md:py-8 rounded-r-2xl border-t border-r border-b border-white/10 md:p-12 lg:p-16 flex flex-col justify-center">
              {/* Mobile-only logo */}
              <div className="md:hidden text-center mb-8">
                <h1
                  className="text-4xl font-extrabold text-white tracking-tight animate-pulse-slow"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  SoundWave
                </h1>
                <p
                  className="mt-3 text-gray-400 font-medium"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Your music, your way
                </p>
              </div>

              {/* Desktop header */}
              <div className="hidden md:block mb-6">
                <h1
                  className="text-4xl font-extrabold text-white tracking-tight animate-pulse-slow"
                  style={{ fontFamily: 'Cabin' }}
                >
                  SoundWave
                </h1>
                <p
                  className="mt-3 text-gray-400 font-medium"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Your music, your way
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative group animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    className="peer w-full text-sm px-4 py-3.5 bg-black/60 border border-white/10 rounded-md text-white placeholder:text-xs placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40 transition-all duration-300 group-focus-within:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    placeholder=" "
                    required
                  />
                  <label
                    htmlFor="email"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    className="absolute left-4 -top-2.5 px-2 bg-black text-gray-400 text-xs transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-indigo-300 peer-focus:text-sm"
                  >
                    Email
                  </label>
                </div>

                <div className="relative group animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    className="peer w-full text-sm px-4 py-3.5 bg-black/60 border border-white/10 rounded-md text-white placeholder:text-xs placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40 transition-all duration-300 group-focus-within:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    placeholder=" "
                    required
                  />
                  <label
                    htmlFor="password"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    className="absolute left-4 -top-2.5 px-2 bg-black text-gray-400 text-xs transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-indigo-300 peer-focus:text-sm"
                  >
                    Password
                  </label>
                </div>

                {error && (
                  <div className="p-4 bg-red-950/50 border border-red-500/40 rounded-md text-red-400 text-sm font-medium animate-shake">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 text-base bg-white text-black font-semibold rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:opacity-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_15px_rgba(0,0,0,0.4)] animate-fade-in-up"
                  style={{ animationDelay: '0.4s', fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-black/40 text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3.5 px-6 bg-white text-black font-semibold rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:opacity-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_15px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 animate-fade-in-up"
                style={{ animationDelay: '0.5s' }}
              >
                {googleLoading ? (
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span className="text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Continue with Google
                </span>
              </button>

              <div className="mt-8 text-center text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <p className="text-gray-500">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200 hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;