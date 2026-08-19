import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, HashRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing' 
import ProtectedRoute from './components/ProtectedRoute'
import DownloadPage from './pages/Download'
import Logo from './images/logo.png'
import { App as CapacitorApp } from '@capacitor/app'; 
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import AdminDashboard from './pages/AdminDashboard'
import SoundieExplorer from './components/SoundieExplorer'
import { updateDynamicFavicon } from './utils/themeHelper'

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const Router = isElectron ? HashRouter : BrowserRouter;

// --- GLOBAL AUTH LOADER ---
function AuthLoader({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  const [fakeLoading, setFakeLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFakeLoading(false);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || fakeLoading) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center relative z-50">
        <div className="w-28 h-28 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          <img src={Logo} alt="Loading..." className="w-full h-full object-contain" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppInner() {
  const navigate = useNavigate(); 
  
  useEffect(() => {
    // OneSignal has been removed.
  }, []);

  useEffect(() => {
    // Look up the saved theme from localStorage on startup
    const savedTheme = localStorage.getItem('soundwave_theme') || 'default';
    updateDynamicFavicon(savedTheme);
  }, []);
  
  useEffect(() => {
    const handleAuthDeepLink = async (url: string) => {
      alert(`Deep Link Detected: ${url.substring(0, 50)}...`); 
      
      if (!url.includes('soundwave://auth')) return;
      
      const queryString = url.split('?')[1];
      const params = new URLSearchParams(queryString || '');
      const token = params.get('token');
      
      if (token) {
        try {
          const credential = GoogleAuthProvider.credential(token);
          await signInWithCredential(auth, credential);
          alert("Firebase sync success! Routing to dashboard..."); 
          navigate('/dashboard');
        } catch (error: any) {
          alert(`Sync Failed: ${error.message}`); 
          console.error("Failed to sync session from deep link:", error);
          navigate('/login');
        }
      } else {
        alert("No token found in URL!"); 
        navigate('/login');
      }
    };
    
    CapacitorApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl && launchUrl.url) {
        handleAuthDeepLink(launchUrl.url);
      }
    });
    
    let appUrlListener: any;
    
    const setupAppListeners = async () => {
      const launchUrl = await CapacitorApp.getLaunchUrl();
      if (launchUrl?.url) {
        handleAuthDeepLink(launchUrl.url);
      }
      
      appUrlListener = await CapacitorApp.addListener('appUrlOpen', (event) => {
        handleAuthDeepLink(event.url);
      });
    };
    
    setupAppListeners();
    
    const handleNativeEvents = (event: any) => {
      const { path, action } = event.detail || {};
      
      if (path === 'search') navigate('/dashboard?focus=search');
      if (path === 'account') navigate('/dashboard?tab=account');
      if (path === 'shuffle') {
        window.dispatchEvent(new CustomEvent('onShuffleShortcut'));
        navigate('/dashboard');
      }
      
      if (action) {
        window.dispatchEvent(new CustomEvent(action));
      }
    };
    
    window.addEventListener('onAppShortcut', handleNativeEvents as any);
    window.addEventListener('onWidgetPlayPause', handleNativeEvents as any);
    window.addEventListener('onWidgetNext', handleNativeEvents as any);
    window.addEventListener('onWidgetPrev', handleNativeEvents as any);
    
    return () => {
      if (appUrlListener) {
        appUrlListener.remove();
      }
      window.removeEventListener('onAppShortcut', handleNativeEvents as any);
      window.removeEventListener('onWidgetPlayPause', handleNativeEvents as any);
      window.removeEventListener('onWidgetNext', handleNativeEvents as any);
      window.removeEventListener('onWidgetPrev', handleNativeEvents as any);
    };
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route 
          path="/" 
          element={Capacitor.isNativePlatform() ? <Navigate to="/login" replace /> : <Landing />} 
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/soundie" element={<SoundieExplorer />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthLoader>
          <PlayerProvider>
            <AppInner />
          </PlayerProvider>
        </AuthLoader>
      </AuthProvider>
    </Router>
  );
}