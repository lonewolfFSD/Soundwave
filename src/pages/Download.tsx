import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  DownloadCloud,
  Terminal,
  Lock,
  Zap,
  Play,
  X,
  Download,
  ShieldAlert 
} from 'lucide-react';

// --- CUSTOM OFFICIAL LOGOS (SVG Paths) ---
const WindowsLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 88 88" className={className}>
    <path fill="currentColor" d="M0 12.402l35.687-4.86.016 34.423-35.67.203zm35.67 33.529l.028 34.453L0 75.48v-29.23zm4.326-39.02L87.314 0v41.26H39.996zM87.314 46.04v41.96L39.996 76.299V45.836z" />
  </svg>
);

const AppleLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 384 512" className={className}>
    <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const AndroidLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 448 512" className={className}>
    <path fill="currentColor" d="M279.1 169.2l47.1-81.6c1.6-2.8.7-6.2-2.1-7.8-2.8-1.6-6.2-.7-7.8 2.1l-46.7 81c-14.7-5.5-30.9-8.5-47.7-8.5-16.8 0-33 3-47.7 8.5l-46.7-81c-1.6-2.8-5-3.8-7.8-2.1-2.8 1.6-3.8 5-2.1 7.8l47.1 81.6C79.7 197.8 0 286.9 0 384h448c0-97.1-79.7-186.2-168.9-214.8zM128 320c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm192 0c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z" />
  </svg>
);

const DownloadPage = () => {
  const [mounted, setMounted] = useState(false);
  
  // --- Modal States ---
  const [showModal, setShowModal] = useState(false);
  const [currentDownloadUrl, setCurrentDownloadUrl] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDownloadClick = (url: string) => {
    setCurrentDownloadUrl(url);
    setAgreed(false);
    setIsDownloading(false);
    setShowModal(true);
  };

  const acceptAndDownload = () => {
    setIsDownloading(true);
    
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = currentDownloadUrl;
      link.setAttribute('download', 'SoundWave-Installer'); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 800);
  };

  const platforms = [
    {
      id: 'windows',
      name: 'Windows OS',
      logo: WindowsLogo,
      available: false,
      tag: 'Engineering',
      specs: [
        'ASIO Audio Drivers',
        'Global Media Keys',
        'Taskbar Mini-Player',
        'WASAPI Exclusive Mode' // New upcoming feature
      ],
      buttonText: 'Late 2026',
      size: '--',
      theme: 'from-blue-500/20 via-cyan-400/10 to-transparent',
      borderGlow: 'border-white/5',
      bentoClass: 'md:col-span-1 md:row-span-2 min-h-[360px] lg:min-h-[420px]',
      previewType: 'desktop',
      image: 'https://i.ibb.co/6RWFC2b4/Screenshot-2026-02-22-151504.png',
      fileUrl: '' 
    },
    {
      id: 'macos',
      name: 'macOS',
      logo: AppleLogo,
      available: false,
      tag: 'In the Lab',
      specs: [
        'Native M3 Optimization',
        'Touch Bar Support',
        'AirPlay 2 Integration',
        'Lossless ALAC Engine' // New upcoming feature
      ],
      buttonText: 'Priority Waitlist',
      size: '--',
      theme: 'from-red-500/20 via-orange-400/10 to-transparent',
      borderGlow: 'border-white/5',
      bentoClass: 'md:col-span-2 md:row-span-1 min-h-[180px] lg:min-h-[200px]',
      previewType: 'window',
      image: 'https://i.ibb.co/BHsyJgYS/Screenshot-2026-02-22-124134.png'
    },
    {
      id: 'ios',
      name: 'iOS',
      logo: AppleLogo,
      available: false,
      tag: 'Engineering',
      specs: [
        'Dynamic Island HUD',
        'Siri Shortcuts',
        'Lock Screen Widgets',
        'CarPlay Wireless' // New upcoming feature
      ],
      buttonText: 'Late 2026',
      size: '--',
      theme: 'from-purple-500/20 via-purple-400/10 to-transparent',
      borderGlow: 'border-white/5',
      bentoClass: 'md:col-span-1 md:row-span-1 min-h-[180px] lg:min-h-[200px]',
      previewType: 'mobile',
      image: 'https://i.ibb.co/6RWFC2b4/Screenshot-2026-02-22-151504.png'
    },
    {
      id: 'android',
      name: 'Android Native',
      logo: AndroidLogo,
      available: false,
      tag: 'v2.0 LAT',
      specs: [
        'Native Download Manager', // The bridge we built
        'Battery-Aware UI', // Auto-reduce motion
        'Hardware Diagnostics', // Device specs tab
        'Shake to Shuffle', // Sensor integration
        'LDAC High-Res Audio'
      ],
      buttonText: 'Early May 2026',
      size: '--',
      // theme: 'from-green-500/20 via-emerald-400/10 to-transparent',
      // borderGlow: 'group-hover:shadow-[0_0_40px_rgba(34,197,94,0.2)] border-green-500/30 hover:border-lime-400/50',
      theme: 'from-green-500/20 via-emerald-400/10 to-transparent',
      borderGlow: 'border-white/5',
      bentoClass: 'md:col-span-1 md:row-span-1 min-h-[180px] lg:min-h-[200px',
      previewType: 'mobile',
      image: 'https://i.ibb.co/6RWFC2b4/Screenshot-2026-02-22-151504.png',
      fileUrl: 'https://drive.google.com/uc?export=download&id=1QGbfyKe5fbmNVXEwc7FX4AJnsOe_n5-U'
    }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans overflow-x-hidden relative flex flex-col selection:bg-purple-500/30">
      
      {/* --- ADVANCED CSS & ANIMATIONS --- */}
      <style>{`
        .glass-panel {
          background: rgba(15, 15, 18, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        
        @keyframes sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        
        .animate-sweep { animation: sweep 3s infinite; }

        .cyber-grid {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
        }

        .dot-matrix {
          background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 8px 8px;
        }

        .mockup-mask {
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%);
        }

        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal { animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .custom-checkbox {
          appearance: none;
          background-color: rgba(255,255,255,0.05);
          margin: 0;
          font: inherit;
          color: currentColor;
          width: 1.15em;
          height: 1.15em;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 0.25em;
          display: grid;
          place-content: center;
          transition: all 0.2s ease-in-out;
        }
        .custom-checkbox::before {
          content: "";
          width: 0.65em;
          height: 0.65em;
          transform: scale(0);
          transition: 120ms transform ease-in-out;
          box-shadow: inset 1em 1em white;
          background-color: white;
          transform-origin: center;
          clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        }
        .custom-checkbox:checked {
          background-color: #a855f7;
          border-color: #a855f7;
        }
        .custom-checkbox:checked::before {
          transform: scale(1);
        }
      `}</style>

      {/* --- AMBIENT GLOWS --- */}
      <div className="fixed inset-0 cyber-grid z-0 pointer-events-none" />
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-purple-600/10 blur-[140px] rounded-full pointer-events-none mix-blend-screen z-0" />
      <div className="fixed bottom-[-20%] right-[-5%] w-[60vw] h-[60vw] bg-orange-600/10 blur-[140px] rounded-full pointer-events-none mix-blend-screen z-0" />

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-12 z-10 w-full max-w-[1000px] mx-auto min-h-screen">
        <br />
        <div className={`text-center mb-10 transition-all duration-1000 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-md border border-orange-500/20 bg-orange-500/5 backdrop-blur-md text-orange-400">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Native Applications</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Choose your <br className="md:hidden block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-orange-300 to-white">
              ecosystem.
            </span>
          </h1>
          <p className='mt-7 text-sm' style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Download the <b>Soundwave Music App</b>, according to your device.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 w-full auto-rows-fr">
          {platforms.map((platform, index) => (
            <div 
              key={platform.id}
              className={`
                group relative rounded-2xl glass-panel border overflow-hidden flex flex-col
                transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${platform.bentoClass}
                ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.98]'}
                ${platform.available ? `${platform.borderGlow} hover:-translate-y-1` : `${platform.borderGlow}`}
              `}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${platform.theme} opacity-50 z-0`}></div>
              {!platform.available && <div className="absolute inset-0 dot-matrix opacity-20 z-0"></div>}

              <div className={`relative z-20 p-5 lg:p-6 flex flex-col h-full ${platform.previewType === 'wide' ? 'md:flex-row md:items-center' : ''}`}>
                <div className={`flex-1 ${platform.previewType === 'wide' ? 'md:w-[55%] md:pr-6' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center backdrop-blur-md border shadow-xl transition-transform duration-500 ${platform.available ? 'bg-black/50 border-purple-500/40 text-white group-hover:scale-105' : 'bg-black/20 border-white/5 text-zinc-600'}`}>
                      <platform.logo className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    
                    <div className={`px-2.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${platform.available ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-black/40 text-zinc-500 border-white/5 backdrop-blur-xl flex items-center gap-1.5'}`}>
                      {!platform.available && <Lock size={10} />}
                      {platform.tag}
                    </div>
                  </div>

                  <h2 className={`text-[22px] font-black mb-3 tracking-tight ${!platform.available && 'text-zinc-500'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {platform.name}
                  </h2>

                  <ul className="space-y-1.5 mb-5 lg:mb-6">
                    {platform.specs.map((spec, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${platform.available ? 'bg-orange-400' : 'bg-zinc-700'}`}></div>
                        <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`text-[11px] lg:text-[11px] font-medium tracking-wide ${platform.available ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {spec}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className={`${platform.previewType === 'desktop' ? 'max-w-[200px]' : 'w-full'} relative z-30`}>
                    {platform.available ? (
                      <button 
                        onClick={() => handleDownloadClick(platform.fileUrl!)} 
                        className="relative w-full overflow-hidden bg-white text-black px-4 py-4 rounded-xl font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.1)] group/btn cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent w-full -translate-x-full group-hover/btn:animate-sweep pointer-events-none"></div>
                        <div className="flex items-center justify-center gap-2 relative z-10" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            <Download size={15} />
                            <span className="text-xs">{platform.buttonText}</span>
                        </div>
                      </button>
                    ) : (
                      <div className="w-full bg-black/40 border border-white/5 text-zinc-600 px-4 py-3 rounded-lg font-bold tracking-wide flex items-center justify-between backdrop-blur-md text-[11px] lg:text-xs">
                        <span className="flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          <Terminal size={14} />
                          {platform.buttonText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {platform.previewType === 'desktop' && (
                  <div className={`absolute -bottom-6 -right-6 w-[85%] h-[65%] rounded-tl-xl border-t border-l border-white/10 bg-black overflow-hidden shadow-2xl transition-all duration-700 mockup-mask ${!platform.available ? 'opacity-30 grayscale' : 'group-hover:-translate-y-1 group-hover:-translate-x-2'}`}>
                    <div className="w-full h-6 bg-zinc-900 border-b border-white/5 flex items-center px-3 gap-1">
                      <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                      <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                      <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                    </div>
    
                    {platform.available && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center text-white/50">
                        <Play fill="currentColor" size={18} />
                      </div>
                    )}
                  </div>
                )}

                {platform.previewType === 'desktop' && (
                  <div className='absolute -bottom-4 -right-4 w-[82%] h-[61%] rounded-t-lg border-t border-x border-white/5 bg-zinc-950 overflow-hidden opacity-30 grayscale mockup-mask transition-all duration-500 group-hover:opacity-50 group-hover:-translate-y-1 '>
                    <img src={platform.image} alt="App Preview" className={`w-full h-full object-cover`} />
                  </div>
                )}

                {platform.previewType === 'window' && (
                  <div className="absolute -bottom-4 right-4 w-[75%] h-[45%] rounded-t-lg border-t border-x border-white/5 bg-zinc-950 overflow-hidden opacity-30 grayscale mockup-mask transition-all duration-500 group-hover:opacity-50">
                    <img src={platform.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                {platform.previewType === 'window' && (
                  <div className="absolute -bottom-4 right-4 w-[75%] h-[45%] rounded-t-lg border-t border-x border-white/5 bg-zinc-950 overflow-hidden opacity-30 grayscale mockup-mask transition-all duration-500 group-hover:opacity-50">
                    <img src={platform.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                {platform.previewType === 'mobile' && (
                  <div className="absolute -bottom-8 -right-2 w-[45%] h-[80%] rounded-[1.5rem] border-[4px] border-zinc-900 bg-black overflow-hidden opacity-30 grayscale transition-all duration-500 group-hover:opacity-50 group-hover:-translate-y-1 transform rotate-12">
                     <div className="absolute top-0 inset-x-0 h-3 bg-zinc-900 rounded-b-md w-1/2 mx-auto z-10"></div>
                    <img src={platform.image} alt="Mobile Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                {platform.previewType === 'wide' && (
                  <div className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden mockup-mask hidden md:block opacity-20 grayscale transition-all duration-500 group-hover:opacity-40">
                    <img src={platform.image} alt="Preview" className="w-full h-full object-cover object-left" />
                  </div>
                )}

              </div>
            </div>

          ))}
        </div>
        <br /><br />
      </main>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg transition-opacity">
          <div className="glass-panel border border-white/10 rounded-xl p-6 lg:p-8 max-w-lg w-full relative animate-modal shadow-2xl">
            
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            
            {!isDownloading ? (
              <>
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center mb-5 border border-orange-500/30">
                  <ShieldAlert size={20} />
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Terms of Download
                </h3>
                
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg text-xs text-zinc-400 mb-5 max-h-[160px] overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                  <p className="mb-2">
                    <strong className="text-white">Soundwave</strong> is a platform built for uploading and listening to music. 
                  </p>
                  <p className="mb-2">
                    By downloading this application, you acknowledge that <strong>Lonewolffsd</strong> does not assume any liability or legal risk for the copyright status or nature of the audio files you upload to the platform. 
                  </p>
                  <p>
                    All user-uploaded songs are saved securely in our database. We respect user privacy and do not access, monitor, or distribute your database entries unless explicitly and legally required to do so by a valid authority.
                  </p>
                </div>
                
                <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox" 
                      className="custom-checkbox cursor-pointer"
                      checked={agreed}
                      onChange={() => setAgreed(!agreed)}
                    />
                  </div>
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors select-none leading-relaxed">
                    I have read the terms, understand the risks, and agree to the conditions stated above.
                  </span>
                </label>
                
                <button 
                  disabled={!agreed}
                  onClick={acceptAndDownload} 
                  className={`w-full py-4 rounded-lg text-[13px] font-bold transition-all duration-300 flex items-center justify-center gap-2
                    ${agreed 
                      ? 'bg-white text-black hover:bg-zinc-400' 
                      : 'bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5'
                    }`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  <Download size={15} />
                  Accept & Download
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center mb-5 border border-green-500/30">
                  <DownloadCloud size={20} />
                </div>
                
                <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Downloading...
                </h3>
                
                <p className="text-zinc-400 mb-6 text-xs lg:text-sm leading-relaxed">
                  Your download has been authorized and initiated. If the file doesn't start downloading within a few seconds, please click the secure link below.
                </p>
                
                <a 
                  href={currentDownloadUrl} 
                  download 
                  className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-lg text-xs font-bold transition-all"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Force Download File
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadPage;