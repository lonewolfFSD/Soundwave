// components/SoundieTermsModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ShieldCheck, X, ChevronDown, Sparkles } from 'lucide-react';

const TERMS_KEY = 'sw_soundie_terms_accepted';

interface SoundieTermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const SoundieTermsModal: React.FC<SoundieTermsModalProps> = ({ isOpen, onAccept, onDecline }) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScrolledToBottom(false);
      setAccepting(false);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, 100);
    }
  }, [isOpen]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 32;
    if (atBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    setAccepting(true);
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem(TERMS_KEY, 'true');
    onAccept();
  };

  const handleDecline = () => {
    onDecline();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[300] bg-black/75"
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          />

          {/* Modal Sheet */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[301] flex flex-col"
            style={{ maxHeight: '92vh' }}
          >
            <div
              className="relative flex flex-col w-full rounded-t-[2.5rem] overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #140c08 0%, #0a0505 60%, #09050d 100%)',
                borderTop: '1px solid rgba(249,115,22,0.18)',
                boxShadow: '0 -24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(249,115,22,0.08) inset',
                maxHeight: '92vh',
              }}
            >
              {/* Noise overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  mixBlendMode: 'overlay',
                  opacity: 0.25,
                }}
              />

              {/* Ambient glow blobs */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] h-[160px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.13) 0%, transparent 70%)', filter: 'blur(40px)' }} />
              <div className="absolute bottom-0 right-0 w-[200px] h-[200px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />

              {/* Drag handle */}
              <div className="relative z-10 flex justify-center pt-4 pb-1">
                <div className="w-10 h-[4px] rounded-full bg-white/15" />
              </div>

              {/* Header */}
              <div className="relative z-10 px-6 pt-4 pb-5 flex items-start gap-4">
                {/* Orb */}
                <div className="relative flex-shrink-0 w-14 h-14 rounded-full overflow-hidden"
                  style={{ boxShadow: '0 0 18px 2px rgba(139,92,246,0.5)' }}>
                  <div className="absolute inset-0" style={{
                    background: `radial-gradient(circle at 70% 30%, rgba(249,115,22,1) 0%, transparent 60%),
                      radial-gradient(circle at 20% 20%, rgba(139,92,246,1) 0%, transparent 60%),
                      radial-gradient(circle at 80% 80%, rgba(236,72,153,1) 0%, transparent 60%),
                      radial-gradient(circle at 10% 90%, rgba(14,165,233,1) 0%, transparent 60%)`,
                    backgroundSize: '150% 150%',
                    animation: 'soundie-terms-swirl 6s ease-in-out infinite alternate',
                  }} />
                  {/* Shine */}
                  <div className="absolute"
                    style={{ top: '6%', left: '10%', width: '50%', height: '35%',
                      background: 'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.3) 0%, transparent 80%)',
                      borderRadius: '50%', zIndex: 2 }} />
                  <Mic size={20} className="absolute inset-0 m-auto text-white z-10 opacity-0" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-orange-400/70 mb-1"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Before you continue
                  </p>
                  <h2 className="text-[20px] font-extrabold text-white leading-tight"
                    style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
                    Soundie Terms
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Read and accept to activate your AI assistant</p>
                </div>

                <button
                  onClick={handleDecline}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Divider */}
              <div className="relative z-10 mx-6 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

              {/* Scrollable terms body */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="relative z-10 flex-1 overflow-y-auto px-6 py-5"
                style={{ fontFamily: 'Space Grotesk, sans-serif', maxHeight: 'calc(92vh - 240px)' }}
              >
                <div className="space-y-5 text-[13px] leading-relaxed text-zinc-400 pb-4">

                  <Section
                    emoji="🎙️"
                    title="Microphone Access"
                    color="orange"
                  >
                    Soundie requires access to your device microphone to process voice commands.
                    Audio is processed <strong className="text-white/80">on-device</strong> or via our speech recognition service.
                    We do <strong className="text-white/80">not</strong> record, store, or share your voice data.
                    Each session is ephemeral — nothing persists after you close Soundie.
                  </Section>

                  <Section
                    emoji="🧠"
                    title="Voice Command Processing"
                    color="purple"
                  >
                    Spoken commands may be sent to third-party speech-to-text services (Capacitor Speech Recognition or your device's native engine)
                    solely to convert audio to text. This text is then processed locally within the app.
                    By using Soundie, you consent to this audio-to-text conversion.
                  </Section>

                  <Section
                    emoji="🔊"
                    title="AI Voice Synthesis"
                    color="blue"
                  >
                    Soundie's responses are spoken aloud using Unreal Speech's TTS API or your device's built-in speech synthesis.
                    Response text (never audio input) is sent to Unreal Speech to generate audio.
                    No personally identifiable data is included in these requests.
                  </Section>

                  <Section
                    emoji="📚"
                    title="Library & Playlist Access"
                    color="emerald"
                  >
                    Soundie reads your music library, queue, and playlists to fulfill commands like
                    "play", "add to playlist", or "delete". All read/write operations go through
                    Firebase under your authenticated account. Soundie cannot access other users' data.
                  </Section>

                  <Section
                    emoji="⚙️"
                    title="Device Controls"
                    color="amber"
                  >
                    Some commands (volume, brightness, sleep timer, app exit) interact with native device APIs
                    via Capacitor plugins. These actions are performed only in direct response to your voice commands
                    and are not automated or scheduled without your explicit instruction.
                  </Section>

                  <Section
                    emoji="🔒"
                    title="Data & Privacy"
                    color="red"
                  >
                    Soundie does not collect analytics, usage patterns, or behavioral data.
                    Your acceptance of these terms is stored locally on your device only (localStorage).
                    You can revoke consent at any time by disabling Soundie in Settings.
                  </Section>

                  <Section
                    emoji="⚠️"
                    title="Limitations & Liability"
                    color="zinc"
                  >
                    Soundie is an experimental AI assistant. Commands are processed using pattern
                    matching and may occasionally misinterpret requests. Destructive actions (e.g., deleting
                    playlists) always require explicit confirmation. SoundWave is not liable for unintended
                    actions resulting from misrecognised voice input.
                  </Section>

                  {/* Agreement line */}
                  <div className="pt-2 pb-1 border-t border-white/5">
                    <p className="text-[12px] text-zinc-500 text-left leading-relaxed">
                      By tapping <span className="text-orange-400 font-semibold">I Agree &amp; Activate</span>, you confirm you have read and understood
                      these terms and consent to the data practices described above.
                    </p>
                  </div>

                </div>
              </div>

              {/* Scroll hint (fades when at bottom) */}
              <AnimatePresence>
                {!scrolledToBottom && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute bottom-[112px] inset-x-0 flex justify-center pointer-events-none z-20"
                  >
                    <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-full"
                      style={{ background: 'rgba(10,5,5,0.7)', backdropFilter: 'blur(8px)' }}>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Scroll to read</span>
                      <ChevronDown size={14} className="text-orange-400 animate-bounce" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="relative z-10 px-6 pt-3 pb-10 flex flex-col gap-3">
                {/* Fade line */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mb-1" />

                <motion.button
                  onClick={handleAccept}
                  disabled={!scrolledToBottom || accepting}
                  whileHover={scrolledToBottom && !accepting ? { scale: 1.02 } : {}}
                  whileTap={scrolledToBottom && !accepting ? { scale: 0.97 } : {}}
                  className="relative w-full py-4 rounded-2xl font-bold text-sm tracking-widest uppercase overflow-hidden flex items-center justify-center gap-2"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    background: scrolledToBottom
                      ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                      : 'rgba(255,255,255,0.05)',
                    color: scrolledToBottom ? '#fff' : 'rgba(255,255,255,0.2)',
                    boxShadow: scrolledToBottom ? '0 0 32px rgba(249,115,22,0.35), 0 4px 16px rgba(0,0,0,0.4)' : 'none',
                    transition: 'all 0.4s ease',
                    cursor: scrolledToBottom ? 'pointer' : 'not-allowed',
                  }}
                >
                  {/* Shine sweep on active */}
                  {scrolledToBottom && !accepting && (
                    <div className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                        animation: 'soundie-terms-shine 2.5s ease-in-out infinite',
                      }}
                    />
                  )}

                  {accepting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Activating…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>I Agree &amp; Activate Soundie</span>
                    </>
                  )}
                </motion.button>

                <button
                  onClick={handleDecline}
                  className="w-full py-3 rounded-2xl text-xs font-medium text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>

          {/* Keyframes injected globally */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
            @keyframes soundie-terms-swirl {
              0%   { background-position: 0% 0%;    transform: scale(1) rotate(0deg); }
              50%  { background-position: 100% 100%; transform: scale(1.05) rotate(15deg); }
              100% { background-position: 0% 100%;  transform: scale(1) rotate(-10deg); }
            }
            @keyframes soundie-terms-shine {
              0%   { transform: translateX(-100%); }
              60%  { transform: translateX(100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Section sub-component ─────────────────────────────────────────────────────
const colorMap: Record<string, { badge: string; border: string; title: string }> = {
  orange:  { badge: 'bg-orange-500/10 text-orange-400',  border: 'border-orange-500/15', title: 'text-orange-300' },
  purple:  { badge: 'bg-purple-500/10 text-purple-400',  border: 'border-purple-500/15', title: 'text-purple-300' },
  blue:    { badge: 'bg-blue-500/10   text-blue-400',    border: 'border-blue-500/15',   title: 'text-blue-300' },
  emerald: { badge: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/15', title: 'text-emerald-300' },
  amber:   { badge: 'bg-amber-500/10  text-amber-400',   border: 'border-amber-500/15',  title: 'text-amber-300' },
  red:     { badge: 'bg-red-500/10    text-red-400',     border: 'border-red-500/15',    title: 'text-red-300' },
  zinc:    { badge: 'bg-zinc-700/40   text-zinc-400',    border: 'border-zinc-700/30',   title: 'text-zinc-300' },
};

const Section: React.FC<{
  emoji: string;
  title: string;
  color: string;
  children: React.ReactNode;
}> = ({ emoji, title, color, children }) => {
  const c = colorMap[color] || colorMap.zinc;
  return (
    <div className={`rounded-2xl border p-4 ${c.border}`}
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className={`text-base w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.badge}`}>
          {emoji}
        </span>
        <h3 className={`text-[13px] font-bold ${c.title}`} style={{ fontFamily: 'Syne, sans-serif' }}>
          {title}
        </h3>
      </div>
      <p className="text-[12.5px] leading-relaxed text-zinc-500 pl-[2.5rem]">{children}</p>
    </div>
  );
};

// ── Helper: check if already accepted ────────────────────────────────────────
export const hasSoundieTermsAccepted = (): boolean => {
  return localStorage.getItem(TERMS_KEY) === 'true';
};

export default SoundieTermsModal;