import React, { useEffect, useRef, useState } from 'react';
import {
  PlaySquare, ListMusic, BrainCircuit, Search, Trash2,
  Volume2, Sun, Clock, Mic, Keyboard, Zap, Shield,
  Music, SkipForward, Shuffle, Radio, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  return { ref, inView };
}

/* ─────────────────────────────────────────────────────────
   ANIMATED COMMAND TERMINAL
───────────────────────────────────────────────────────── */
const commands = [
  { prompt: 'play Blinding Lights',          reply: '▶ Playing "Blinding Lights" by The Weeknd',        color: '#f97316' },
  { prompt: 'skip',                           reply: '⏭ Skipping to next track',                          color: '#8b5cf6' },
  { prompt: 'set volume to 60',               reply: '🔊 Volume set to 60%',                               color: '#06b6d4' },
  { prompt: 'add this to Chill mix',          reply: '✅ Added to "Chill mix"',                            color: '#10b981' },
  { prompt: 'enable 8D audio',               reply: '🎧 8D Spatial Audio activated',                       color: '#ec4899' },
  { prompt: 'create playlist called Focus',  reply: '🔥 Playlist "Focus" created',                         color: '#f97316' },
  { prompt: 'sleep timer in 30 minutes',     reply: '😴 Music stops in 30 min. Sleep well!',               color: '#8b5cf6' },
  { prompt: 'delete my Workout mix',         reply: '⚠ Are you sure? This cannot be undone.',              color: '#ef4444' },
  { prompt: 'yes',                            reply: '🗑 "Workout mix" deleted permanently',                color: '#ef4444' },
  { prompt: 'what\'s playing',               reply: '🎵 "Levitating" by Dua Lipa',                        color: '#06b6d4' },
  { prompt: 'max brightness',                reply: '☀️ Screen at maximum brightness',                     color: '#fbbf24' },
  { prompt: 'play something random',         reply: '🎲 Playing "Midnight Rain" — surprise!',              color: '#10b981' },
];

const CommandTerminal: React.FC = () => {
  const [lines, setLines] = useState<{ type: 'prompt' | 'reply'; text: string; color: string }[]>([]);
  const [currentCmd, setCurrentCmd] = useState(0);
  const [typing, setTyping] = useState('');
  const [phase, setPhase] = useState<'typing' | 'reply' | 'pause'>('typing');
  const termRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useScrollReveal();
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    const runCmd = (idx: number) => {
      if (idx >= commands.length) { setCurrentCmd(0); setLines([]); started.current = false; return; }
      const cmd = commands[idx];
      let i = 0;
      setPhase('typing');
      const typeInterval = setInterval(() => {
        i++;
        setTyping(cmd.prompt.slice(0, i));
        if (i >= cmd.prompt.length) {
          clearInterval(typeInterval);
          setPhase('reply');
          setTimeout(() => {
            setLines(prev => [
              ...prev,
              { type: 'prompt', text: cmd.prompt, color: cmd.color },
              { type: 'reply',  text: cmd.reply,  color: cmd.color },
            ]);
            setTyping('');
            setPhase('pause');
            setTimeout(() => {
              setCurrentCmd(idx + 1);
              runCmd(idx + 1);
            }, 900);
          }, 400);
        }
      }, 38);
    };
    runCmd(0);
  }, [inView]);

  // auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines, typing]);

  return (
    <div ref={ref} className="relative w-full max-w-xl mx-auto">
      {/* Glow behind terminal */}
      <div className="absolute -inset-4 rounded-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)', filter: 'blur(30px)' }} />

      <div className="relative rounded-2xl overflow-hidden border border-white/10"
        style={{ background: 'linear-gradient(145deg, #14080a 0%, #0d0510 100%)' }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-[11px] text-white/25 font-mono tracking-widest uppercase">soundie · voice terminal</span>
        </div>

        {/* Terminal body */}
        <div ref={termRef} className="px-5 py-4 font-mono text-[12.5px] space-y-1.5 overflow-y-auto"
          style={{ minHeight: 240, maxHeight: 320 }}>
          {lines.slice(-14).map((l, i) => (
            <div key={i} className={l.type === 'prompt' ? 'flex gap-2 items-start' : 'flex gap-2 items-start pl-3'}>
              {l.type === 'prompt' ? (
                <>
                  <span style={{ color: l.color }} className="opacity-70 select-none">›</span>
                  <span className="text-white/85">{l.text}</span>
                </>
              ) : (
                <span style={{ color: l.color }} className="opacity-80">{l.text}</span>
              )}
            </div>
          ))}
          {/* Live typing line */}
          {(phase === 'typing' || phase === 'reply') && typing && (
            <div className="flex gap-2 items-start">
              <span className="text-orange-400 opacity-70 select-none">›</span>
              <span className="text-white/85">{typing}<span className="animate-pulse text-orange-400">▌</span></span>
            </div>
          )}
          {phase === 'pause' && (
            <div className="flex gap-2">
              <span className="text-orange-400 opacity-70">›</span>
              <span className="animate-pulse text-orange-400">▌</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   WAVEFORM VISUALIZER (pure CSS bars, no canvas)
───────────────────────────────────────────────────────── */
const WaveformViz: React.FC = () => {
  const bars = Array.from({ length: 32 });
  return (
    <div className="flex items-end gap-[3px] h-14">
      {bars.map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            background: `linear-gradient(to top, rgba(249,115,22,0.9), rgba(139,92,246,0.6))`,
            animation: `waveBar ${0.6 + (i % 7) * 0.1}s ease-in-out infinite alternate`,
            animationDelay: `${(i * 0.045)}s`,
            minWidth: 3,
          }}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   LEVENSHTEIN DEMO - animated typo engine
───────────────────────────────────────────────────────── */
const TypoDemo: React.FC = () => {
  const pairs = [
    { typed: 'Blinding Liths',  found: 'Blinding Lights' },
    { typed: 'Starboy The Weend', found: 'Starboy — The Weeknd' },
    { typed: 'levitating dua',  found: 'Levitating — Dua Lipa' },
    { typed: 'midnigt rainn',   found: 'Midnight Rain' },
  ];
  const [idx, setIdx] = useState(0);
  const [showFound, setShowFound] = useState(false);
  const { ref, inView } = useScrollReveal();
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const cycle = () => {
      setShowFound(false);
      setTimeout(() => setShowFound(true), 700);
    };
    cycle();
    const t = setInterval(() => {
      setIdx(p => (p + 1) % pairs.length);
      cycle();
    }, 2800);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref} className="rounded-2xl border border-white/8 p-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="text-[11px] uppercase tracking-widest text-orange-400/60 font-mono mb-3">Typo Engine · Live</div>
      <div className="space-y-2">
        <div className="text-[13px] text-zinc-500 line-through font-mono">{pairs[idx].typed}</div>
        <AnimatePresence mode="wait">
          {showFound && (
            <motion.div
              key={pairs[idx].found}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <span className="text-[13px] text-emerald-400 font-mono">{pairs[idx].found}</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">matched</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-[11px] text-zinc-600 font-mono mt-1">
          Levenshtein distance ≤ 2 · confirmed ✓
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   SECTION REVEAL WRAPPER
───────────────────────────────────────────────────────── */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const { ref, inView } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────────────────── */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  commands: string[];
  accent: string;
  delay?: number;
}
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc, commands: cmds, accent, delay = 0 }) => {
  const { ref, inView } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-3xl border border-white/8 p-5 overflow-hidden cursor-default"
      style={{ background: 'rgba(255,255,255,0.015)' }}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 65%)` }} />

      {/* Icon */}
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 border border-white/8"
        style={{ background: `${accent}18`, color: accent }}>
        {icon}
      </div>

      <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</h3>
      <p className="text-[12.5px] text-zinc-500 leading-relaxed mb-4">{desc}</p>

      {/* Command examples */}
      <div className="space-y-1.5">
        {cmds.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ color: accent }} className="text-[10px] opacity-60 select-none font-mono">›</span>
            <span className="text-[11.5px] font-mono text-white/50">{c}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   STAT COUNTER
───────────────────────────────────────────────────────── */
const Stat: React.FC<{ value: string; label: string; delay: number }> = ({ value, label, delay }) => {
  const { ref, inView } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-black text-white mb-1"
        style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div className="text-[11px] text-zinc-500 uppercase tracking-widest">{label}</div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   PARTICLE DUST (memoized, stable positions)
───────────────────────────────────────────────────────── */
const particles = Array.from({ length: 30 }, (_, i) => ({
  left: ((i * 37 + 13) % 100),
  top: ((i * 53 + 7) % 100),
  dur: 4 + (i % 5),
  delay: (i * 0.4) % 5,
  dx: ((i % 5) - 2) * 12,
}));

const ParticleDust: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {particles.map((p, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full"
        style={{
          left: `${p.left}%`,
          top: `${p.top}%`,
          background: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#8b5cf6' : '#ec4899',
          boxShadow: `0 0 6px ${i % 3 === 0 ? 'rgba(249,115,22,0.7)' : i % 3 === 1 ? 'rgba(139,92,246,0.7)' : 'rgba(236,72,153,0.7)'}`,
        }}
        animate={{ y: [0, -90], x: [0, p.dx], opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
        transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'linear' }}
      />
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const SoundieExplorer: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div
      className="min-h-screen w-full bg-[#060305] text-white overflow-y-auto overflow-x-hidden selection:bg-orange-500/30 pb-32"
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      {/* ── SVG NOISE FILTER ── */}
      <svg className="hidden">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        </filter>
      </svg>

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');

        @keyframes orbSwirl {
          0%   { background-position: 0% 0%;    transform: scale(1) rotate(0deg); }
          50%  { background-position: 100% 100%; transform: scale(1.06) rotate(18deg); }
          100% { background-position: 0% 100%;  transform: scale(1) rotate(-12deg); }
        }
        .soundie-mesh {
          background:
            radial-gradient(circle at 70% 30%, rgba(249,115,22,1) 0%, transparent 60%),
            radial-gradient(circle at 20% 20%, rgba(139,92,246,1) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(236,72,153,1) 0%, transparent 60%),
            radial-gradient(circle at 10% 90%, rgba(14,165,233,1) 0%, transparent 60%);
          background-size: 160% 160%;
          animation: orbSwirl 7s ease-in-out infinite alternate;
        }
        .soundie-orb-shine {
          position: absolute;
          top: 6%; left: 10%;
          width: 50%; height: 35%;
          background: radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.28) 0%, transparent 80%);
          border-radius: 50%;
          z-index: 2;
          pointer-events: none;
        }
        .grain-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
          opacity: 0.35;
          pointer-events: none;
        }
        .orange-grid-bg {
          background-size: 44px 44px;
          background-image:
            linear-gradient(to right, rgba(249,115,22,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(249,115,22,0.06) 1px, transparent 1px);
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
        }
        @keyframes waveBar {
          from { height: 4px; }
          to   { height: 100%; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        .soundie-scanline {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(249,115,22,0.3), transparent);
          animation: scanline 3.5s linear infinite;
          pointer-events: none;
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(1.06); }
        }
        .soundie-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(249,115,22,0.25);
          animation: ringPulse 2.8s ease-in-out infinite;
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        .orb-float { animation: floatY 5s ease-in-out infinite; }
      `}</style>

      {/* ── FULL PAGE GRAIN ── */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.2'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay', opacity: 0.15,
        }}
      />

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #1a0d0a 0%, #060305 65%)' }}
      >
        {/* Grid */}
        <div className="absolute inset-0 orange-grid-bg pointer-events-none z-0" />
        {/* Particles */}
        <ParticleDust />
        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 flex flex-col items-center px-6">
          {/* Orb with rings */}
          <div className="relative flex items-center justify-center mb-10 orb-float">
            {/* Rings */}
            <div className="soundie-ring" style={{ width: 320, height: 320, animationDelay: '0s' }} />
            <div className="soundie-ring" style={{ width: 260, height: 260, animationDelay: '0.9s' }} />
            <div className="soundie-ring" style={{ width: 200, height: 200, animationDelay: '1.8s', borderColor: 'rgba(139,92,246,0.2)' }} />
            {/* Main orb */}
            <div className="relative w-[160px] h-[160px] rounded-full overflow-hidden z-10"
              style={{ boxShadow: '0 0 60px rgba(139,92,246,0.4), 0 0 120px rgba(249,115,22,0.15)' }}>
              <div className="absolute inset-0 soundie-mesh" />
              <div className="soundie-orb-shine" />
              <div className="absolute inset-0 grain-overlay rounded-full" />
              {/* Scanline */}
              <div className="soundie-scanline" />
            </div>
          </div>

          {/* Badge */}


          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-[43px] md:text-8xl font-black text-center leading-none mb-5 tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Meet{' '}
            <span className="relative">
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)' }}>
                Soundie
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="text-base md:text-xl text-zinc-400 text-center max-w-xl mb-3 font-medium leading-relaxed"
          >
            <span className=''>The voice-activated neural core of your SoundWave library.</span>
            <br />
            <span className="text-zinc-600 text-xs">She speaks. She listens. She acts.</span>
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-col items-center gap-3"
          >
            <button
              onClick={() => navigate('/download')}
              className="flex items-center gap-2.5 mb-3 mt-6 px-8 py-4 rounded-2xl text-black font-bold tracking-wider text-sm uppercase transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #fff, #fff)',
                boxShadow: '0 0 40px rgba(249,115,22,0.3), 0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
           
              ONLY AVAILABLE IN THE APP
            </button>
            <a href="/" className="text-[11px] text-zinc-400 hover:text-zinc-400 transition-colors underline tracking-widest uppercase">
              Return to Home
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Scroll down</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-[1px] h-8 rounded-full"
            style={{ background: 'linear-gradient(to bottom, rgba(249,115,22,0.5), transparent)' }}
          />
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════ */}
      <div className="border-y border-white/6 py-10 hidden"
        style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <Stat value="11+" label="Command Types"   delay={0} />
          <Stat value="∞"   label="Voice or Text"   delay={0.1} />
          <Stat value="8D"  label="Spatial Audio"   delay={0.2} />
          <Stat value="0ms" label="Filler Stripped"  delay={0.3} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          LIVE TERMINAL
      ══════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-6 py-24 border-t border-white/10">
        <Reveal className="mb-12 text-left">
          <p className="text-[11px] uppercase tracking-widest text-orange-400/60 mb-3 font-mono">See it in action</p>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
            Every Command,{' '}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #f97316, #8b5cf6)' }}>
              Executed Instantly
            </span>
          </h2>
          <p className="text-zinc-500 max-w-lg mx-auto text-sm leading-relaxed">
            Natural language, typos, casual phrasing — Soundie handles all of it without missing a beat.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <CommandTerminal />
        </Reveal>
      </div>

      {/* ══════════════════════════════════════════════
          PLAYBACK CONTROL
      ══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <Reveal className="mb-10 md:text-center">
          <p className="text-[11px] uppercase tracking-widest text-purple-400/60 font-mono mb-2">Core Engine</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
            Playback Intelligence
          </h2>
          <p className="text-zinc-500 text-sm">Full transport control. Zero hands required.</p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard delay={0}    icon={<PlaySquare size={20} />} accent="#f97316"
            title="Play, Pause, Skip"
            desc="Simple voice transport. Resume from where you left off. Go back to the previous track instantly."
            commands={['"Play"', '"Skip"', '"Previous track"', '"Pause"']} />
          <FeatureCard delay={0.08} icon={<Music size={20} />} accent="#8b5cf6"
            title="Play Specific Songs"
            desc="Search your library by title or artist. High-confidence matches play instantly. Lower scores ask for confirmation."
            commands={['"Play Blinding Lights"', '"Put on some Weeknd"', '"Hear Levitating"']} />
          <FeatureCard delay={0.16} icon={<Shuffle size={20} />} accent="#ec4899"
            title="Random Vibe"
            desc="No decision fatigue. Soundie pulls an unexpected track from your whole library for you."
            commands={['"Play something random"', '"Play anything"', '"Surprise me"']} />
          <FeatureCard delay={0.24} icon={<Radio size={20} />} accent="#06b6d4"
            title="Queue Management"
            desc="Add any song to your queue without interrupting what's playing. Ask what's coming up next."
            commands={['"Queue up Starboy"', '"What\'s in the queue?"', '"Add this up next"']} />
          <FeatureCard delay={0.32} icon={<SkipForward size={20} />} accent="#10b981"
            title="Now Playing Info"
            desc="Instantly know the track title and artist without looking at the screen."
            commands={['"What\'s playing?"', '"Who sings this?"', '"Song name?"']} />
          <FeatureCard delay={0.40} icon={<Clock size={20} />} accent="#fbbf24"
            title="Sleep Timer"
            desc="Tell Soundie when to stop. She sets a timer and stops the music cleanly when it expires."
            commands={['"Sleep timer in 30 minutes"', '"Stop music in 1 hour"']} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TYPO ENGINE + CONTEXT MEMORY
      ══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Typo Engine */}
          <Reveal>
            <div className="rounded-3xl border border-white/8 p-6 h-full"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 border border-orange-500/20"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                <Search size={20} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Levenshtein Typo Engine
              </h3>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed mb-5">
                Soundie calculates edit distance between your spoken words and every song in your library.
                Up to 2 character errors allowed. No exact match needed — she finds what you meant.
              </p>
              <TypoDemo />
            </div>
          </Reveal>

          {/* Contextual Memory */}
          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-white/8 p-6 h-full"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 border border-purple-500/20"
                style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                <BrainCircuit size={20} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Multi-Turn Context Memory
              </h3>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed mb-5">
                Soundie tracks conversation state across turns. She strips filler words, waits for your yes/no,
                and doesn't forget what she asked. Feels like talking to a person.
              </p>
              {/* Conversation mockup */}
              <div className="space-y-2.5 text-[12px] font-mono">
                {[
                  { who: 'you',    text: 'hey soundie delete my workout playlist please', color: 'text-zinc-400' },
                  { who: 'soundie', text: '⚠ Sure? "Workout" will be permanently deleted.', color: 'text-orange-400' },
                  { who: 'you',    text: 'yeah do it', color: 'text-zinc-400' },
                  { who: 'soundie', text: '🗑 Gone. Playlist deleted.', color: 'text-red-400' },
                ].map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: m.who === 'you' ? -8 : 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                    className={`flex gap-2 ${m.who === 'soundie' ? 'flex-row-reverse' : ''}`}
                  >
                    <span className="text-[9px] text-zinc-700 uppercase tracking-widest self-end mb-0.5 flex-shrink-0">
                      {m.who}
                    </span>
                    <span className={`px-3 py-1.5 rounded-xl border border-white/6 ${m.color} text-[11.5px]`}
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {m.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          LIBRARY & PLAYLIST MANAGEMENT
      ══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <Reveal className="mb-10 md:text-center">
          <p className="text-[11px] uppercase tracking-widest text-emerald-400/60 font-mono mb-2">Firebase · Live</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
            Full Library Control
          </h2>
          <p className="text-zinc-500 text-sm">CRUD operations on your database. Hands-free.</p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard delay={0}    icon={<ListMusic size={20} />}   accent="#10b981"
            title="Create Playlists"
            desc="Name your playlist mid-sentence or let Soundie ask for a name in a follow-up turn."
            commands={['"Create playlist Focus"', '"Make a new mix"']} />
          <FeatureCard delay={0.08} icon={<Zap size={20} />}        accent="#f97316"
            title="Add Songs"
            desc="Move any track into any playlist by title. Typo-safe search included."
            commands={['"Add this to Chill mix"', '"Put Starboy in Pop"']} />
          <FeatureCard delay={0.16} icon={<SkipForward size={20} />} accent="#06b6d4"
            title="Remove Songs"
            desc="Strip a track from a specific playlist without deleting it from your library."
            commands={['"Remove this from Pop mix"', '"Take Levitating out of Focus"']} />
          <FeatureCard delay={0.24} icon={<Trash2 size={20} />}     accent="#ef4444"
            title="Delete Playlists"
            desc="Guarded by a confirmation gate. Soundie always asks twice before permanent deletion."
            commands={['"Delete Workout mix"', '"Erase Study playlist"']} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SYSTEM CONTROLS SHOWCASE
      ══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <Reveal>
          <div className="relative rounded-[1.5rem] overflow-hidden border border-white/8 p-6 md:p-12"
            style={{ background: 'linear-gradient(135deg, #0e0810 0%, #0a0607 100%)' }}>
            {/* Ambient */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />

            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-widest text-cyan-400/60 font-mono mb-2">Native Capacitor Plugins</p>
              <h2 className="text-2xl md:text-3xl font-black mb-8 tracking-tight"
                style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
                Hardware-Level Controls
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <Volume2 size={18} />, color: '#06b6d4', title: 'Volume Granularity',
                    items: ['"Set volume to 40%"', '"Crank it up"', '"Mute"', '"Max volume"'] },
                  { icon: <Sun size={18} />, color: '#fbbf24', title: 'Screen Brightness',
                    items: ['"Set brightness to 80%"', '"Dim the screen"', '"Full brightness"'] },
                  { icon: <Zap size={18} />, color: '#ec4899', title: '8D Spatial Audio',
                    items: ['"Enable 8D audio"', '"Turn on spatial mode"', '"Disable 8D"'] },
                ].map((item, i) => (
                  <Reveal key={i} delay={i * 0.1}>
                    <div className="rounded-2xl border border-white/6 p-4"
                      style={{ background: 'rgba(255,255,255,0.025)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/8"
                          style={{ background: `${item.color}18`, color: item.color }}>
                          {item.icon}
                        </div>
                        <h4 className="font-bold text-sm text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                          {item.title}
                        </h4>
                      </div>
                      <div className="space-y-1.5">
                        {item.items.map((cmd, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span style={{ color: item.color }} className="font-mono text-[10px] opacity-50">›</span>
                            <span className="text-[11px] font-mono text-zinc-500">{cmd}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════
          VOICE + TEXT INPUT + TTS
      ══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voice Input */}
          <Reveal>
            <div className="rounded-3xl border border-white/8 p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="absolute top-4 right-4 opacity-20">
                <WaveformViz />
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 border border-orange-500/20"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                <Mic size={20} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Voice + Typed Input
              </h3>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed">
                Speak via native device microphone (Capacitor Speech Recognition, Android + iOS)
                or switch to keyboard mode mid-session. Both pipelines share the exact same command engine.
              </p>
              <div className="mt-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] border border-orange-500/20 text-orange-400/70 font-mono">Voice · Native</span>
                <span className="px-3 py-1 rounded-full text-[10px] border border-zinc-700 text-zinc-500 font-mono">Text · Keyboard</span>
              </div>
            </div>
          </Reveal>

          {/* Unreal Speech TTS */}
          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-white/8 p-6 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 border border-purple-500/20"
                style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                <Keyboard size={20} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Unreal Speech TTS
              </h3>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed">
                Responses are spoken aloud via Unreal Speech's neural TTS API — voice ID "af_nicole" on mobile.
                Falls back to browser Web Speech API automatically. Audio is visualiser-reactive, driving the orb's scale and glow in real time.
              </p>
              <div className="mt-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] border border-purple-500/20 text-purple-400/70 font-mono">Unreal Speech API</span>
                <span className="px-3 py-1 rounded-full text-[10px] border border-zinc-700 text-zinc-500 font-mono">Web TTS Fallback</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SAFETY & CONTENT FILTER
      ══════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <Reveal>
          <div className="rounded-3xl border border-emerald-500/15 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start"
            style={{ background: 'rgba(16,185,129,0.04)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border border-emerald-500/20"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <Shield size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Built-in Content Safety
              </h3>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed max-w-xl">
                Soundie runs an explicit content filter on every input before processing. Inappropriate language without
                a valid music command is blocked with a polite redirect. Destructive actions (playlist deletion) are
                locked behind a mandatory confirmation gate — she never acts unless you explicitly say yes.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <Reveal>
          <div className="relative rounded-[2.5rem] overflow-hidden border border-white/8 p-10 md:p-16"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0d0a 0%, #060305 70%)' }}>
            <div className="absolute inset-0 orange-grid-bg pointer-events-none opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 65%)', filter: 'blur(40px)' }} />

            <div className="relative z-10">

              <h2 className="text-2xl md:text-5xl text-left font-black mb-4 tracking-tight"
                style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
                She's waiting<br />for your voice.
              </h2>
              <p className="text-zinc-500 text-sm mb-8 max-w-sm text-left mx-auto">
                Soundie is only available on the SoundWave native apps.
              </p>
              <button
                onClick={() => navigate('/download')}
                className="inline-flex w-full items-center gap-2.5 px-8 py-4 rounded-2xl text-black font-bold tracking-wider text-sm uppercase transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #fff, #fff)',
                  boxShadow: '0 0 50px rgba(249,115,22,0.25)',
                }}
              >
                Download SoundWave App
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default SoundieExplorer;