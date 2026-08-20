import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Zap, Volume2, Save, Vibrate } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

interface MobileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSettings: React.FC<MobileSettingsProps> = ({ isOpen, onClose }) => {
  // --- PREFERENCES STATE ---
  const [shakeEnabled, setShakeEnabled] = useState(localStorage.getItem('sw_shake_shuffle') !== 'false');
  const [hapticsEnabled, setHapticsEnabled] = useState(localStorage.getItem('sw_haptics') !== 'false');
  const [duckingEnabled, setDuckingEnabled] = useState(localStorage.getItem('sw_ducking') !== 'false');
  const [soundieEnabled, setSoundieEnabled] = useState(localStorage.getItem('sw_soundie_enabled') !== 'false');

  // --- MODAL & DRAG STATE ---
  const [dragY, setDragY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('soundwave_theme') || 'default');
  
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  // --- THEME ENGINE (Copied from AccountModal) ---
  const themeConfig: Record<string, any> = {
    default: { modalBg: 'bg-[#09090b]', border: 'border-zinc-800', highlight: 'text-slate-200', activeToggle: 'bg-slate-300' },
    sunset: { modalBg: 'bg-[#2a0808]', border: 'border-orange-500/20', highlight: 'text-orange-400', activeToggle: 'bg-orange-500' },
    valentine: { modalBg: 'bg-[#330a1a]', border: 'border-pink-500/20', highlight: 'text-pink-400', activeToggle: 'bg-pink-500' },
    jungle: { modalBg: 'bg-[#062414]', border: 'border-emerald-500/20', highlight: 'text-emerald-400', activeToggle: 'bg-emerald-500' },
    ocean: { modalBg: 'bg-[#061a29]', border: 'border-cyan-500/20', highlight: 'text-cyan-400', activeToggle: 'bg-cyan-500' },
    cyberpunk: { modalBg: 'bg-[#22063b]', border: 'border-fuchsia-500/20', highlight: 'text-fuchsia-400', activeToggle: 'bg-fuchsia-500' },
    midnight: { modalBg: 'bg-[#1a0c30]', border: 'border-violet-500/20', highlight: 'text-violet-400', activeToggle: 'bg-violet-500' },
    coffee: { modalBg: 'bg-[#26150a]', border: 'border-amber-600/20', highlight: 'text-amber-500', activeToggle: 'bg-amber-600' }
  };
  const activeThemeObj = themeConfig[currentTheme] || themeConfig['default'];

  // Listen for theme changes while modal is open
  useEffect(() => {
  const handleThemeUpdate = () => {
    // This allows the theme to update on both Web and Native instantly
    const savedTheme = localStorage.getItem('soundwave_theme') || 'default';
    setCurrentTheme(savedTheme); // Or setTheme depending on the component's state name
  };

  window.addEventListener('theme-change', handleThemeUpdate);
  // Also listen for general settings updates if they affect the theme
  window.addEventListener('sw-settings-updated', handleThemeUpdate);

  return () => {
    window.removeEventListener('theme-change', handleThemeUpdate);
    window.removeEventListener('sw-settings-updated', handleThemeUpdate);
  };
}, []);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsClosing(false);
    }
  }, [isOpen]);

  // --- HAPTIC TOGGLE HELPER ---
  const handleToggle = async (setter: React.Dispatch<React.SetStateAction<boolean>>, currentValue: boolean) => {
    const isNative = Capacitor.isNativePlatform(); 

    // Only vibrate if native and (haptics are on OR we're turning them on)
    if (isNative && (hapticsEnabled || (setter === setHapticsEnabled && !currentValue))) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {}
    }
    
    setter(!currentValue);
  };

  // --- DRAG TO CLOSE LOGIC ---
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { onClose(); setIsClosing(false); }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    setIsDraggingState(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    setIsDraggingState(false);
    if (dragY > 150) handleClose(); 
    else setDragY(0);
  };

  // --- SAVE PREFERENCES ---
  const handleSave = async () => {
    // 1. Save locally for the web view
    localStorage.setItem('sw_shake_shuffle', shakeEnabled.toString());
    localStorage.setItem('sw_haptics', hapticsEnabled.toString());
    localStorage.setItem('sw_ducking', duckingEnabled.toString());
    localStorage.setItem('sw_soundie_enabled', soundieEnabled.toString());
    localStorage.setItem('sw_voice_cmds', 'false'); // Force voice assistant off

    // 2. SAVE NATIVELY FOR ANDROID STUDIO 
    await Preferences.set({ key: 'sw_shake_shuffle', value: shakeEnabled.toString() });
    await Preferences.set({ key: 'sw_ducking', value: duckingEnabled.toString() });
    await Preferences.set({ key: 'sw_soundie_enabled', value: soundieEnabled.toString() });
    await Preferences.set({ key: 'sw_voice_cmds', value: 'false' }); // Force voice assistant off

    // 3. Update Android Bridge
    if ((window as any).AndroidSettings) {
        (window as any).AndroidSettings.updateSettings(
          shakeEnabled, 
          hapticsEnabled, 
          true, // toast notifications for shuffle
          false // voice commands disabled
        );
      }
      
    if (hapticsEnabled) {
      try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}
    }
    
    window.dispatchEvent(new Event('sw-native-settings-updated'));
    window.dispatchEvent(new Event('sw-settings-updated'));
    handleClose();
  };

  return (
    <div className={`fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md md:p-4 transition-opacity duration-300 ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      
      {/* Background click to close */}
      <div className="absolute inset-0 z-0" onClick={handleClose}></div>
      
      <div 
        className={`${activeThemeObj.modalBg} border ${activeThemeObj.border} w-full max-w-md md:rounded-4xl shadow-2xl relative z-10 flex flex-col h-[100vh] md:h-[600px] overflow-hidden ${isDraggingState ? 'transition-none' : 'transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)'} ${!isOpen || isClosing ? 'translate-y-full md:translate-y-10 md:scale-[0.98]' : 'translate-y-0 md:scale-100'}`}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
      >
        
        {/* Mobile Drag Handle */}
        <div 
          className="md:hidden w-full flex flex-col items-center justify-center pt-5 pb-2 cursor-grab active:cursor-grabbing shrink-0 relative z-20 bg-black/40 backdrop-blur-xl border-b border-white/5 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mb-4 pointer-events-none" />
          <h2 className="text-lg mb-2 font-black text-slate-100 tracking-tight pointer-events-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Native Settings</h2>
        </div>

        {/* Spotlighting Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-slate-500/[0.03] rounded-full blur-[100px] pointer-events-none"></div>

        {/* Desktop Close */}
        <button onClick={handleClose} className="hidden md:flex absolute top-4 right-4 z-20 w-10 h-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
          <X size={20}/>
        </button>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-gradient-to-br from-white/[0.01] to-transparent z-10 relative">
          
          <div className="space-y-6">
            <div className="hidden md:block">
              <h3 className="text-xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Native Hardware</h3>
              <p className="text-zinc-500 text-xs" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Manage how SoundWave interacts with your device.</p>
            </div>

            <div className=" px-4 space-y-3 backdrop-blur-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              
              {/* Toggle: Shake to Shuffle */}
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5"> Shake to Shuffle</h4>
                  <p className="text-[12px] text-zinc-500 mt-1 max-w-[200px]">Shuffle music by physically shaking your device.</p>
                </div>
                <button onClick={() => handleToggle(setShakeEnabled, shakeEnabled)} className={`w-10 h-5 rounded-full p-0.5 transition-colors border border-white/10 ${shakeEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full transition-transform ${shakeEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                </button>
              </div>
              
              <div className="h-px bg-white/5 w-full"></div>

              {/* Toggle: Haptic Feedback */}
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5"> Haptic Feedback</h4>
                  <p className="text-[12px] text-zinc-500 mt-1 max-w-[170px]">Physical vibration on clicks and UI navigation.</p>
                </div>
                <button onClick={() => handleToggle(setHapticsEnabled, hapticsEnabled)} className={`w-10 h-5 rounded-full p-0.5 transition-colors border border-white/10 ${hapticsEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full transition-transform ${hapticsEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                </button>
              </div>

              <div className="h-px bg-white/5 w-full"></div>

              {/* Toggle: Audio Ducking */}
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5"> Audio Ducking</h4>
                  <p className="text-[12px] text-zinc-500 mt-1 max-w-[200px]">Temporarily lower music volume on incoming calls and notifications.</p>
                </div>
                <button onClick={() => handleToggle(setDuckingEnabled, duckingEnabled)} className={`w-10 h-5 rounded-full p-0.5 transition-colors border border-white/10 ${duckingEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full transition-transform ${duckingEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                </button>
              </div>

              {/* Toggle: Soundie AI Assistant (Native Only) */}
              {Capacitor.isNativePlatform() && (
                <>
                  <div className="h-px bg-white/5 w-full"></div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5"> Soundie AI Assistant</h4>
                      <p className="text-[12px] text-zinc-500 mt-1 max-w-[200px]">Show Soundie AI on navigation & sidebar.</p>
                    </div>
                    <button onClick={() => handleToggle(setSoundieEnabled, soundieEnabled)} className={`w-10 h-5 rounded-full p-0.5 transition-colors border border-white/10 ${soundieEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full transition-transform ${soundieEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* Footer Save Button */}
        <div className="p-5 md:p-8 bg-black/40 backdrop-blur-xl border-t border-white/5 z-20 shrink-0">
          <button 
            onClick={handleSave}
            className="w-full py-3.5 bg-slate-200 text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-white hover:-translate-y-0.5 transition-all shadow-xl active:scale-95"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Apply Settings
          </button>
        </div>

      </div>
    </div>
  );
};

export default MobileSettings;