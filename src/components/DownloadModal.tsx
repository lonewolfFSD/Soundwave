import React from 'react';
import { X, Download, Zap, Headphones, Mic, Timer, Sparkles, Palette, HardDrive, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../images/logo.png';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] w-full h-full bg-white md:bg-black overflow-y-auto overflow-x-hidden animate-in fade-in duration-500 flex flex-col md:items-center justify-end md:justify-center">
      
      {/* ==========================================
          BACKGROUNDS (Split for Mobile/Desktop)
      ========================================== */}
      
      {/* 📱 MOBILE BACKGROUND (Exact Original) */}
      <div className="fixed inset-0 z-0 pointer-events-none md:hidden">
        <img 
          src="https://i.ibb.co/zWstgpvV/Picsart-26-04-16-21-05-43-489.jpg" 
          alt="Immersive Background" 
          className="w-86 -mt-20 h-full object-contain opacity-100 scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/90 to-[#030303]/40" />
      </div>

      {/* 💻 DESKTOP BACKGROUND (New Dark Radial) */}
      <div className="fixed inset-0 z-0 pointer-events-none hidden md:block">
        <img 
          src="https://i.ibb.co/zWstgpvV/Picsart-26-04-16-21-05-43-489.jpg" 
          alt="Immersive Background" 
          className="w-full h-full object-cover object-center opacity-40 scale-105" 
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#030303]/80 to-[#030303]" />
      </div>

      {/* SHARED CLOSE BUTTON */}
      <button 
        onClick={onClose} 
        className="fixed top-4 right-4 md:top-8 md:right-8 p-2 md:p-2.5 bg-black/20 md:bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all z-50 shadow-xl"
      >
        <X size={20} />
      </button>

      {/* ==========================================
          📱 MOBILE LAYOUT (Exact Original Code)
      ========================================== */}
      <div className="relative z-10 w-full min-h-full flex flex-col justify-end px-6 pb-8 max-w-2xl mx-auto md:hidden">
        
        <div className="flex flex-col items-start text-left mb-6 animate-in slide-in-from-bottom-8 fade-in duration-700 mt-20">
          <div className="w-24 h-24 mb-4 relative">
            <div className="absolute inset-0 blur-xl rounded-full" />
            <img src={Logo} alt="Soundwave" className="w-full h-full object-contain -ml-5 relative z-10 drop-shadow-xl" />
          </div>
          
          <h1 className="text-3xl -mt-5 font-black text-white leading-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Unlock the Full <br/>
            <span className="text-white">
              Soundwave Experience
            </span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-sm leading-relaxed" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Get the native Android app for exclusive hardware controls and an uninterrupted, premium listening experience.
          </p>
        </div>

        <div className="space-y-2 mb-8 w-full max-w-sm">
          <div className="flex items-center gap-1.5 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '200ms' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <Mic size={14} className="text-white" />
            </div>
            <p className="text-slate-200 font-medium text-[13px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>"Hey Google" Voice Integration</p>
          </div>

          <div className="flex items-center gap-1.5 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '300ms' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <p className="text-slate-200 font-medium text-[13px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Shake to Shuffle & Native Haptics</p>
          </div>

          <div className="flex items-center gap-1.5 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '300ms' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <Palette size={14} className="text-white" />
            </div>
            <p className="text-slate-200 font-medium text-[13px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Custom Mood Theme Palette</p>
          </div>

          <div className="flex items-center gap-1.5 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '400ms' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <Headphones size={14} className="text-white" />
            </div>
            <p className="text-slate-200 font-medium text-[13px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Hardware Boosted 8D Audio</p>
          </div>

          <div className="flex items-center gap-1.5 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '500ms' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <Timer size={14} className="text-white" />
            </div>
            <p className="text-slate-200 font-medium text-[13px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Smart Sleep Timer</p>
          </div>

          <div className="flex items-center gap-1.5 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '600ms' }}>
            <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-zinc-500" />
            </div>
            <p className="text-zinc-400 font-medium text-[12px] italic" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>And many more native features...</p>
          </div>
        </div>

        <div className="w-full max-w-sm animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both" style={{ animationDelay: '800ms' }}>
          <button 
            onClick={() => { navigate('/download'); onClose(); }}
            className="w-full py-3.5 bg-white text-black text-sm font-black rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <Download size={14} />
            Download for free
          </button>
          <p className="text-center text-zinc-500 text-[9px] font-medium uppercase tracking-widest mt-4">
            Available directly for Android
          </p>
        </div>
      </div>


      {/* ==========================================
          💻 DESKTOP LAYOUT (New Glass Card)
      ========================================== */}
      <div className="relative z-10 w-full hidden md:flex flex-col p-12 max-w-5xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl">
        
        <div className="flex flex-row items-center gap-16 w-full">
          
          <div className="flex-1 flex flex-col items-start text-left animate-in slide-in-from-left-8 fade-in duration-700">
            <div className="w-28 h-28 mb-6 relative">
              <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full" />
              <img src={Logo} alt="Soundwave" className="w-full h-full object-contain -ml-5 relative z-10 drop-shadow-2xl" />
            </div>
            
            <h1 className="text-4xl -mt-2 font-black text-white leading-tight mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Unlock the Full <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
                Native Experience
              </span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-sm leading-relaxed mb-8" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Get the Android app for exclusive hardware controls, immersive layouts, and an uninterrupted premium listening experience.
            </p>

            <div className="w-full max-w-sm animate-in fade-in duration-700 delay-700 fill-mode-both">
              <button 
                onClick={() => { navigate('/download'); onClose(); }}
                className="w-full py-4 bg-white text-black text-base font-black rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Download size={18} />
                Download for Free
              </button>
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 w-full">
              
              <div className="flex items-center gap-2.5 animate-in slide-in-from-bottom-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '200ms' }}>
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <Palette size={14} className="text-white" />
                </div>
                <p className="text-slate-200 font-medium text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Premium Theme Engine</p>
              </div>

              <div className="flex items-center gap-2.5 animate-in slide-in-from-bottom-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '300ms' }}>
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <HardDrive size={14} className="text-white" />
             </div>
                <p className="text-slate-200 font-medium text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Native Download Manager</p>
              </div>

              <div className="flex items-center gap-2.5 animate-in slide-in-from-bottom-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '400ms' }}>
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <Zap size={14} className="text-white" />
                </div>
                <p className="text-slate-200 font-medium text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Shake to Shuffle & Haptics</p>
              </div>

              <div className="flex items-center gap-2.5 animate-in slide-in-from-bottom-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '600ms' }}>
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <Sliders size={14} className="text-white" />
                </div>
                <p className="text-slate-200 font-medium text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Advanced Audio Equalizer</p>
              </div>

              <div className="flex items-center gap-2.5 animate-in slide-in-from-bottom-8 fade-in duration-500 fill-mode-both" style={{ animationDelay: '700ms' }}>
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <Timer size={14} className="text-white" />
                </div>
                <p className="text-slate-200 font-medium text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Smart Sleep Timer</p>
              </div>

            </div>

            <div className="flex items-center gap-1.5 mt-6 animate-in fade-in duration-500 fill-mode-both pl-2" style={{ animationDelay: '800ms' }}>
              <Sparkles size={14} className="text-zinc-500" />
              <p className="text-zinc-500 font-medium text-[12px] italic" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Plus hardware diagnostics, mono audio, and more...</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DownloadModal;