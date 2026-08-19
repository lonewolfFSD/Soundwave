import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Play, Headphones, Palette, CloudUpload, Mic2,
  ArrowRight, Zap, Layers, MessageSquare, Activity, ChevronDown,
  Cloud, Shield, Shuffle, BarChart2, Music, Star, Globe, Lock,
  Twitter, Github, Instagram, Mail, Volume2, Sparkles,
  Mic, BrainCircuit, Search, ChevronRight, ListMusic, SkipForward,
  Clock, Trash2, Radio
} from 'lucide-react'
import Logo from '../images/logo.png'

/* ─────────────────────────────────────────────────────────
   SCROLL ANIMATION HOOK
───────────────────────────────────────────────────────── */
const useScrollAnimation = (threshold = 0.1) => {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target) } },
      { threshold }
    )
    if (elementRef.current) observer.observe(elementRef.current)
    return () => { if (elementRef.current) observer.unobserve(elementRef.current) }
  }, [threshold])
  return { elementRef, isVisible }
}

/* ─────────────────────────────────────────────────────────
   HERO ALBUM GRID
───────────────────────────────────────────────────────── */
const ALBUM_COVERS = [
  "https://imgs.search.brave.com/0wk7hQ4vHgYE1N71XD8KQH0O6JPM-no28QVJs7y0_-Q/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/NDFMZHVTUGNZa0wu/anBn",
  "https://imgs.search.brave.com/zFcX12oApb1EVJKy286I9SvxTU2KvC1ht-TMF-qLxHE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLmRp/c2NvZ3MuY29tL3FP/b1duRDFEd21iRHpZ/enJjS0ZmblFfMnBK/cWQtQ0xWSlRfbHJU/SDhPT00vcnM6Zml0/L2c6c20vcTo0MC9o/OjMwMC93OjMwMC9j/ek02THk5a2FYTmpi/MmR6L0xXUmhkR0Zp/WVhObExXbHQvWVdk/bGN5OVNMVEUyTVRN/MS9ORFkyTFRFMk1E/UXdNelE0L09URXRP/VFUzTWk1cWNHVm4u/anBlZw",
  "https://imgs.search.brave.com/zGALGHMufkzZDj738fUTDPHqVSCwcJh9P9pl1-9FeX4/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS50aGVjcmltc29u/LmNvbS9waG90b3Mv/MjAxOS8xMC8yOC8y/MzMwMjlfMTM0MDM4/MC5qcGc",
  "https://i.pinimg.com/736x/28/7a/31/287a31728dd2d5db55bfc765e22fc320.jpg",
  "https://i.pinimg.com/736x/78/60/97/7860974a742b2214cc17587c15e52097.jpg",
  "https://i.pinimg.com/736x/0f/4b/aa/0f4baaa45bceb12c01c8c7015f0c6708.jpg",
  "https://i.pinimg.com/736x/fd/1b/51/fd1b5187b2430642823e5f4a9212e00d.jpg",
  "https://i.pinimg.com/736x/30/80/b8/3080b84dbe0d8b894ddc6413092134eb.jpg",
  "https://i.pinimg.com/1200x/17/55/bf/1755bf2f6f84f8e6d6a041e78afc0564.jpg",
  "https://i.pinimg.com/736x/9a/de/7a/9ade7ace43cd664ed7e39987b575bd74.jpg",
  "https://i.pinimg.com/1200x/dd/47/2e/dd472e5314ca93ac4d652d909d82a8d6.jpg",
  "https://i.pinimg.com/736x/8b/df/36/8bdf36725b728bc2dd03dd773c46c3ec.jpg",
  "https://i.pinimg.com/736x/c0/de/4f/c0de4f297459f34e4fd7380c7cf28507.jpg",
  "https://i.pinimg.com/736x/65/ec/f8/65ecf8ba6298402ee8f7e315492e0e1d.jpg",
  "https://i.pinimg.com/736x/c4/73/d5/c473d53b67385a586d23464339ca6ebd.jpg",
  "https://i.pinimg.com/736x/4a/64/b4/4a64b459ea7b2f590b0dd44b3325462d.jpg",
  "https://i.pinimg.com/736x/01/a7/8a/01a78a5578e3b03187fccd60a5086422.jpg",
  "https://i.pinimg.com/736x/45/76/a8/4576a899740055654533aea36dc0a74f.jpg",
  "https://i.pinimg.com/736x/9e/ca/51/9eca5182f0e55564a6ffb2e7a5201414.jpg",
  "https://i.pinimg.com/1200x/71/7e/c5/717ec53cdfa4ee513bed1e25d23a27e5.jpg",
  "https://i.pinimg.com/1200x/4d/06/b3/4d06b3eabebada3de2e72308290164b9.jpg",
  "https://i.pinimg.com/736x/35/18/c6/3518c6acd6b97ae704c200ce3ddff685.jpg"
]

const HeroGrid = () => {
  const numCells = 48
  const [cells, setCells] = useState<{ url: string | null; visible: boolean }[]>(
    Array.from({ length: numCells }, () => ({ url: null, visible: false }))
  )
  useEffect(() => {
    const interval = setInterval(() => {
      setCells(prev => {
        const next = [...prev]
        const idx = Math.floor(Math.random() * numCells)
        if (!next[idx].visible) {
          next[idx] = { url: ALBUM_COVERS[Math.floor(Math.random() * ALBUM_COVERS.length)], visible: true }
          setTimeout(() => {
            setCells(c => { const u = [...c]; u[idx] = { ...u[idx], visible: false }; return u })
          }, 3000)
        }
        return next
      })
    }, 450)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className="absolute inset-[-5%] z-0 overflow-hidden pointer-events-none opacity-80 md:opacity-50">
      <div className="w-full h-full grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 grid-rows-3 md:grid-rows-4">
        {cells.map((cell, i) => (
          <div key={i} className="w-full h-full border-[0.5px] border-white/5 bg-white/[0.01] relative overflow-hidden">
            <div className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out"
              style={{ backgroundImage: cell.url ? `url(${cell.url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', opacity: cell.visible ? 1 : 0, filter: 'grayscale(20%) contrast(1.1) brightness(0.7)' }} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#030303_80%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303]" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SOUNDIE LIVE TERMINAL
───────────────────────────────────────────────────────── */
const soundieCommands = [
  { prompt: 'play Blinding Lights',          reply: '▶  Playing "Blinding Lights" by The Weeknd',     color: '#f97316' },
  { prompt: 'enable 8D audio',               reply: '🎧 8D Spatial Audio activated',                   color: '#ec4899' },
  { prompt: 'add this to Chill mix',         reply: '✅ Added to "Chill mix"',                         color: '#10b981' },
  { prompt: 'set volume to 60',              reply: '🔊 Volume set to 60%',                            color: '#06b6d4' },
  { prompt: 'create playlist called Focus',  reply: '🔥 Playlist "Focus" created',                     color: '#f97316' },
  { prompt: 'sleep timer in 30 minutes',     reply: '😴 Music stops in 30 min. Sleep well!',           color: '#8b5cf6' },
  { prompt: "what's playing",                reply: '🎵 "Levitating" by Dua Lipa',                     color: '#06b6d4' },
  { prompt: 'play something random',         reply: '🎲 Playing "Midnight Rain" — surprise!',          color: '#10b981' },
  { prompt: 'skip',                          reply: '⏭  Skipping to next track',                       color: '#8b5cf6' },
]

const SoundieTerminal: React.FC = () => {
  const [lines, setLines] = useState<{ type: 'prompt' | 'reply'; text: string; color: string }[]>([])
  const [typing, setTyping] = useState('')
  const [phase, setPhase] = useState<'typing' | 'reply' | 'pause'>('typing')
  const termRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold: 0.2 })
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || startedRef.current) return
    startedRef.current = true
    const runCmd = (idx: number) => {
      if (idx >= soundieCommands.length) { setLines([]); startedRef.current = false; return }
      const cmd = soundieCommands[idx]
      let i = 0
      setPhase('typing')
      const t = setInterval(() => {
        i++
        setTyping(cmd.prompt.slice(0, i))
        if (i >= cmd.prompt.length) {
          clearInterval(t)
          setPhase('reply')
          setTimeout(() => {
            setLines(prev => [...prev,
              { type: 'prompt', text: cmd.prompt, color: cmd.color },
              { type: 'reply', text: cmd.reply, color: cmd.color }
            ])
            setTyping('')
            setPhase('pause')
            setTimeout(() => runCmd(idx + 1), 900)
          }, 400)
        }
      }, 38)
    }
    runCmd(0)
  }, [inView])

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [lines, typing])

  return (
    <div ref={sectionRef} className="relative w-full max-w-xl mx-auto">
      <div className="absolute -inset-6 rounded-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse,rgba(249,115,22,0.14) 0%,transparent 70%)', filter: 'blur(30px)' }} />
      <div className="relative rounded-2xl overflow-hidden border border-white/10"
        style={{ background: 'linear-gradient(145deg,#14080a 0%,#0d0510 100%)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-3 h-3 rounded-full bg-red-500/70" /><div className="w-3 h-3 rounded-full bg-yellow-500/70" /><div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-[11px] text-white/25 font-mono tracking-widest uppercase">soundie · voice terminal</span>
        </div>
        <div ref={termRef} className="px-5 py-4 font-mono text-[12.5px] space-y-1.5 overflow-y-auto" style={{ minHeight: 240, maxHeight: 300 }}>
          {lines.slice(-14).map((l, i) => (
            <div key={i} className={l.type === 'prompt' ? 'flex gap-2 items-start' : 'flex gap-2 items-start pl-3'}>
              {l.type === 'prompt'
                ? <><span style={{ color: l.color }} className="opacity-70 select-none">›</span><span className="text-white/85">{l.text}</span></>
                : <span style={{ color: l.color }} className="opacity-80">{l.text}</span>}
            </div>
          ))}
          {(phase === 'typing' || phase === 'reply') && typing && (
            <div className="flex gap-2 items-start">
              <span className="text-orange-400 opacity-70 select-none">›</span>
              <span className="text-white/85">{typing}<span className="animate-pulse text-orange-400">▌</span></span>
            </div>
          )}
          {phase === 'pause' && <div className="flex gap-2"><span className="text-orange-400 opacity-70">›</span><span className="animate-pulse text-orange-400">▌</span></div>}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SOUNDIE ORB
───────────────────────────────────────────────────────── */
const SoundieOrb: React.FC<{ size?: number }> = ({ size = 130 }) => (
  <div className="relative flex items-center justify-center orb-float flex-shrink-0" style={{ width: size + 160, height: size + 160 }}>
    <div className="soundie-ring" style={{ width: size + 160, height: size + 160, animationDelay: '0s' }} />
    <div className="soundie-ring" style={{ width: size + 110, height: size + 110, animationDelay: '0.9s' }} />
    <div className="soundie-ring" style={{ width: size + 60, height: size + 60, animationDelay: '1.8s', borderColor: 'rgba(139,92,246,0.2)' }} />
    <div className="relative rounded-full overflow-hidden z-10" style={{ width: size, height: size, boxShadow: '0 0 60px rgba(139,92,246,0.5),0 0 120px rgba(249,115,22,0.2)' }}>
      <div className="absolute inset-0 soundie-mesh" />
      <div className="soundie-orb-shine" />
      <div className="absolute inset-0 grain-overlay rounded-full" />
      <div className="soundie-scanline" />
    </div>
  </div>
)

/* ─────────────────────────────────────────────────────────
   WAVEFORM
───────────────────────────────────────────────────────── */
const WaveformViz: React.FC = () => (
  <div className="flex items-end gap-[3px] h-10">
    {Array.from({ length: 28 }).map((_, i) => (
      <div key={i} className="flex-1 rounded-full" style={{
        background: 'linear-gradient(to top,rgba(249,115,22,0.9),rgba(139,92,246,0.6))',
        animation: `waveBar ${0.6 + (i % 7) * 0.1}s ease-in-out infinite alternate`,
        animationDelay: `${i * 0.045}s`, minWidth: 2
      }} />
    ))}
  </div>
)

/* ─────────────────────────────────────────────────────────
   SOUNDIE CAPABILITY PILL
───────────────────────────────────────────────────────── */
const CapabilityPill: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-[11px]"
    style={{ borderColor: `${color}30`, background: `${color}10`, color }}>
    <span className="opacity-60">›</span>
    <span className="text-white/70">{text}</span>
  </div>
)

/* ─────────────────────────────────────────────────────────
   PARTICLES
───────────────────────────────────────────────────────── */
const particleData = Array.from({ length: 20 }, (_, i) => ({
  left: (i * 37 + 13) % 100,
  top: (i * 53 + 7) % 100,
  dur: 4 + (i % 5),
  delay: (i * 0.4) % 5,
  color: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#8b5cf6' : '#ec4899',
}))

const SoundieParticles: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {particleData.map((p, i) => (
      <div key={i} className="absolute w-1 h-1 rounded-full soundie-particle"
        style={{ left: `${p.left}%`, top: `${p.top}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, boxShadow: `0 0 6px ${p.color}` }} />
    ))}
  </div>
)

/* ─────────────────────────────────────────────────────────
   STAT + TESTIMONIAL
───────────────────────────────────────────────────────── */
const StatCard = ({ value, label, icon: Icon }: { value: string; label: string; icon: any }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all">
    <Icon size={16} className="text-indigo-400 mb-1" />
    <span className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</span>
    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{label}</span>
  </div>
)

const TestimonialCard = ({ quote, author, role, delay }: { quote: string; author: string; role: string; delay: string }) => (
  <div className="bento-card p-6 scroll-reveal flex flex-col gap-4" style={{ animationDelay: delay }}>
    <div className="flex gap-1">{[...Array(5)].map((_, i) => <Star key={i} size={11} className="fill-indigo-400 text-indigo-400" />)}</div>
    <p className="text-sm text-zinc-300 leading-relaxed flex-1">"{quote}"</p>
    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white">{author[0]}</div>
      <div>
        <p className="text-xs font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{author}</p>
        <p className="text-[10px] text-zinc-500">{role}</p>
      </div>
    </div>
  </div>
)

/* ─────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────── */
const Landing = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }) }, [user, navigate])

  const heroRef         = useScrollAnimation()
  const showcaseRef     = useScrollAnimation(0.1)
  const soundieRef      = useScrollAnimation(0.05)
  const bentoRef        = useScrollAnimation(0.05)
  const statsRef        = useScrollAnimation(0.1)
  const testimonialsRef = useScrollAnimation(0.05)
  const howItWorksRef   = useScrollAnimation(0.1)
  const faqRef          = useScrollAnimation(0.1)
  const ctaRef          = useScrollAnimation(0.2)

  const toggleFAQ = (i: number) => setOpenFAQ(openFAQ === i ? null : i)

  const faqs = [
    { q: "What audio formats are supported?", a: "SoundWave supports MP3, WAV, OGG, and FLAC for high-fidelity lossless playback directly from your personal cloud." },
    { q: "How does the spatial 8D engine work?", a: "We utilize hardware-accelerated Web Audio APIs to dynamically pan and filter frequencies, creating a psychoacoustic 3D orbital effect without needing special headphones." },
    { q: "Is my uploaded music private?", a: "Absolutely. Your library is synced securely via Firebase to your personal authenticated account. No one else has access to your designated cloud bucket." },
    { q: "What can Soundie AI actually do?", a: "Soundie can play/pause/skip tracks, search your library by voice, create and manage playlists, control volume and brightness, set sleep timers, enable 8D audio — all hands-free via voice or text." },
    { q: "Will there be a native mobile app?", a: "Yes. While SoundWave is currently an optimized PWA, native iOS and Android wrappers with full Soundie AI are actively in our deployment pipeline." },
  ]

  const steps = [
    { icon: CloudUpload, title: "Upload Your Library", desc: "Drag and drop any audio file. We handle metadata, artwork, and cloud sync automatically.", color: "text-cyan-400", bg: "from-cyan-500/10" },
    { icon: Palette, title: "Personalize Everything", desc: "Edit titles, swap covers, add lyrics. Make every album feel like it was designed for you.", color: "text-purple-400", bg: "from-purple-500/10" },
    { icon: Volume2, title: "Talk to Soundie", desc: "Enable spatial 8D audio and give Soundie AI voice commands. Hands-free, ad-free, your way.", color: "text-orange-400", bg: "from-orange-500/10" },
  ]

  if (user) return null

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&family=Syne:wght@700;800;900&display=swap');

        /* Landing */
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 25%{transform:translateY(-10px) rotate(1deg)} 75%{transform:translateY(10px) rotate(-1deg)} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes reveal { from{opacity:0;transform:translateY(30px) scale(0.97);filter:blur(8px)} to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .scroll-reveal { opacity: 0; }
        .is-visible .scroll-reveal { animation: reveal 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }

        .glass-panel { background:rgba(20,20,25,0.4); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.08); box-shadow:0 30px 60px rgba(0,0,0,0.4),inset 0 0 0 1px rgba(255,255,255,0.02); }
        .bento-card { background:linear-gradient(180deg,rgba(24,24,27,0.6) 0%,rgba(15,15,18,0.8) 100%); border:1px solid rgba(255,255,255,0.05); border-radius:1.25rem; overflow:hidden; position:relative; transition:all 0.4s cubic-bezier(0.16,1,0.3,1); }
        .bento-card:hover { border-color:rgba(255,255,255,0.2); transform:translateY(-4px); box-shadow:0 20px 40px -10px rgba(0,0,0,0.5),0 0 20px rgba(99,102,241,0.1); }
        .text-gradient { background:linear-gradient(135deg,#ffffff 0%,#71717a 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .text-gradient-accent { background:linear-gradient(135deg,#818cf8 0%,#c084fc 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .shimmer-text { background:linear-gradient(90deg,#fff 0%,#818cf8 40%,#c084fc 60%,#fff 100%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:shimmer 4s linear infinite; }
        .animate-float { animation:float 8s ease-in-out infinite; }
        .animate-bg-shift { background-size:200% 200%; animation:gradient-shift 8s ease infinite; }
        .animate-spin-slow { animation:spin-slow 20s linear infinite; }
        .footer-link { color:rgba(113,113,122,1); font-size:0.8rem; transition:color 0.2s; }
        .footer-link:hover { color:rgba(255,255,255,0.8); }

        /* Soundie */
        @keyframes orbSwirl { 0%{background-position:0% 0%;transform:scale(1) rotate(0deg)} 50%{background-position:100% 100%;transform:scale(1.06) rotate(18deg)} 100%{background-position:0% 100%;transform:scale(1) rotate(-12deg)} }
        .soundie-mesh { background:radial-gradient(circle at 70% 30%,rgba(249,115,22,1) 0%,transparent 60%),radial-gradient(circle at 20% 20%,rgba(139,92,246,1) 0%,transparent 60%),radial-gradient(circle at 80% 80%,rgba(236,72,153,1) 0%,transparent 60%),radial-gradient(circle at 10% 90%,rgba(14,165,233,1) 0%,transparent 60%); background-size:160% 160%; animation:orbSwirl 7s ease-in-out infinite alternate; }
        .soundie-orb-shine { position:absolute; top:6%; left:10%; width:50%; height:35%; background:radial-gradient(ellipse at 40% 30%,rgba(255,255,255,0.28) 0%,transparent 80%); border-radius:50%; z-index:2; pointer-events:none; }
        .grain-overlay { background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); mix-blend-mode:overlay; opacity:0.35; pointer-events:none; }
        @keyframes waveBar { from{height:4px} to{height:100%} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
        .soundie-scanline { position:absolute; left:0; right:0; height:2px; background:linear-gradient(to right,transparent,rgba(249,115,22,0.3),transparent); animation:scanline 3.5s linear infinite; pointer-events:none; }
        @keyframes ringPulse { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.06)} }
        .soundie-ring { position:absolute; border-radius:50%; border:1px solid rgba(249,115,22,0.25); animation:ringPulse 2.8s ease-in-out infinite; }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .orb-float { animation:floatY 5s ease-in-out infinite; }
        .orange-grid-bg { background-size:44px 44px; background-image:linear-gradient(to right,rgba(249,115,22,0.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(249,115,22,0.06) 1px,transparent 1px); mask-image:radial-gradient(ellipse at center,black 40%,transparent 80%); }
        @keyframes particleFloat { 0%{opacity:0;transform:translateY(0)} 20%{opacity:0.6} 80%{opacity:0.3} 100%{opacity:0;transform:translateY(-90px)} }
        .soundie-particle { animation:particleFloat linear infinite; }
        .soundie-card { background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.07); border-radius:1.5rem; overflow:hidden; position:relative; transition:all 0.4s cubic-bezier(0.16,1,0.3,1); }
        .soundie-card:hover { border-color:rgba(249,115,22,0.25); transform:translateY(-3px); box-shadow:0 20px 40px -10px rgba(0,0,0,0.6),0 0 20px rgba(249,115,22,0.08); }
      `}</style>

      {/* Ambient glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen z-0" />

      {/* Suggestion button */}
      <button onClick={() => alert("Suggestion modal coming soon!")}
        className="fixed bottom-6 right-6 z-50 glass-panel hover:bg-white/10 text-white px-4 py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 group">
        <MessageSquare size={16} className="group-hover:animate-bounce" />
        <span className="text-xs font-bold hidden md:block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Suggest Feature</span>
      </button>

      {/* ══════ NAV ══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030303]/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-10 h-10 flex items-center justify-center mr-2"><img src={Logo} alt="SoundWave Logo" className="w-full h-full object-contain" /></div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SoundWave</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-xs text-zinc-500 hover:text-white transition-colors" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Features</a>
            <a href="#soundie" className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />Soundie AI
            </a>
            <a href="#how-it-works" className="text-xs text-zinc-500 hover:text-white transition-colors" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>How it Works</a>
            <a href="#faq" className="text-xs text-zinc-500 hover:text-white transition-colors" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>FAQ</a>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors hidden md:block hover:underline" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Log in</Link>
            <Link to="/download" className="text-xs font-bold bg-white text-black px-5 py-2.5 rounded-xl hover:scale-[102%] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Download App</Link>
          </div>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <main ref={heroRef.elementRef} className={`relative z-10 min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 ${heroRef.isVisible ? 'is-visible' : ''}`}>
        <HeroGrid />
        <div className="scroll-reveal relative z-10 mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm" style={{ animationDelay: '50ms' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Now in Public Beta</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tighter mb-5 max-w-4xl leading-[1.02] scroll-reveal relative z-10"
          style={{ animationDelay: '100ms', fontFamily: 'Space Grotesk, sans-serif' }}>
          Your personal cloud.<br /><span className="shimmer-text">Engineered for sound.</span>
        </h1>
        <p className="text-sm md:text-base text-zinc-400 max-w-lg mb-10 leading-relaxed scroll-reveal relative z-10" style={{ animationDelay: '200ms', fontFamily: 'Space Grotesk, sans-serif' }}>
          Upload your library, experience spatial 8D audio, and talk to <span className="text-orange-400 font-semibold">Soundie AI</span> hands-free. The ultimate private streaming setup — no ads, no algorithms.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 scroll-reveal z-20" style={{ animationDelay: '300ms' }}>
          <Link to="/signup" style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            className="group flex items-center justify-center gap-2 bg-white text-black px-10 py-3.5 rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <Play size={16} fill="currentColor" /> Start Listening Free
          </Link>
          <a href="#soundie" style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            className="flex items-center justify-center backdrop-blur-lg gap-2 border border-orange-500/30 bg-orange-500/5 text-orange-300 px-8 py-3.5 rounded-xl text-sm font-medium hover:border-orange-400/50 hover:text-orange-200 transition-all">
            Meet Soundie AI
          </a>
        </div>

      </main>

      {/* ══════ MARQUEE ══════ */}
      <div className="w-full border-y border-white/5 bg-zinc-950/80 backdrop-blur-md overflow-hidden py-4 relative z-10 flex">
        <div className="flex whitespace-nowrap animate-[marquee_40s_linear_infinite]">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 mx-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Immersive 8D</span>
              <span className="w-1 h-1 rounded-full bg-indigo-500/50" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Dynamic Aura</span>
              <span className="w-1 h-1 rounded-full bg-purple-500/50" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Cloud Sync</span>
              <span className="w-1 h-1 rounded-full bg-pink-500/50" />
              <span className="text-[10px] font-extrabold tracking-[0.2em] text-orange-500/80 uppercase">Soundie AI</span>
              <span className="w-1 h-1 rounded-full bg-orange-500/50" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Ad Free</span>
              <span className="w-1 h-1 rounded-full bg-yellow-500/50" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Ghost Lyrics</span>
              <span className="w-1 h-1 rounded-full bg-rose-500/50" />
            </div>
          ))}
        </div>
      </div>

      {/* ══════ DEEP DIVE FEATURE ══════ */}
      <section id="features" ref={showcaseRef.elementRef} className={`relative z-10 max-w-6xl mx-auto px-6 py-16 border-t border-white/5 ${showcaseRef.isVisible ? 'is-visible' : ''}`}>
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="w-full lg:w-1/2 scroll-reveal relative" style={{ animationDelay: '100ms' }}>
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-3xl -z-10 rounded-full" />
            <img src="https://i.ibb.co/SwRzH4tV/Untitled-design.png" alt="Personal Streaming Interface" className="w-full aspect-video object-cover -mb-10 rounded-2xl border border-white/10 shadow-2xl" />
            <div className="absolute -bottom-4 -right-4 glass-panel p-3 rounded-lg flex items-center gap-3 animate-float">
              <Activity size={16} className="text-indigo-400" />
              <div>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Library</p>
                <p className="text-[13px] font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>100% Ad-Free</p>
              </div>
            </div>
            <div className="absolute -top-4 -left-4 glass-panel p-3 rounded-lg flex items-center gap-3 animate-float" style={{ animationDelay: '2s' }}>
              <Lock size={14} className="text-green-400" />
              <div>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Privacy</p>
                <p className="text-[13px] font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>End-to-End</p>
              </div>
            </div>
          </div>
          <div className="w-full mt-10 lg:w-1/2 scroll-reveal" style={{ animationDelay: '200ms' }}>
            <h2 className="text-3xl font-extrabold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Your music. <span className="text-gradient-accent">Your rules.</span>
            </h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed max-w-md">Upload any track and build your own ad-free streaming library. Customize everything from album covers and lyrics to song titles, and let the entire UI morph to match your mood.</p>
            <ul className="space-y-3">
              {[
                { icon: Palette, color: "text-indigo-400", label: "Customize album covers, titles, and lyrics" },
                { icon: Layers, color: "text-purple-400", label: "Dynamic themes that adapt to your mood" },
                { icon: CloudUpload, color: "text-pink-400", label: "Upload and stream from anywhere, ad-free" },
                { icon: Shuffle, color: "text-cyan-400", label: "Smart queue, crossfade, and gapless playback" },
              ].map(({ icon: Icon, color, label }, i) => (
                <li key={i} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/15 transition-colors"><Icon size={14} className={color} /></div>
                  <span className="text-sm text-zinc-300 font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          ★  SOUNDIE AI — HERO FEATURE SECTION  ★
      ════════════════════════════════════════════════════ */}
      <section id="soundie" ref={soundieRef.elementRef} className={`relative z-10 overflow-hidden ${soundieRef.isVisible ? 'is-visible' : ''}`}>

        {/* Fade in from landing dark */}
        <div className="h-20 bg-gradient-to-b from-[#030303] to-transparent absolute top-0 left-0 right-0 z-20 pointer-events-none" />

        <div className="relative py-28" style={{ background: 'radial-gradient(ellipse at 50% 0%,#1a0d0a 0%,#060305 60%)' }}>
          <div className="absolute inset-0 orange-grid-bg pointer-events-none opacity-40 z-0" />
          <SoundieParticles />

          {/* Ambient */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none z-0"
            style={{ background: 'radial-gradient(ellipse,rgba(249,115,22,0.1) 0%,transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full pointer-events-none z-0"
            style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)', filter: 'blur(60px)' }} />

          <div className="relative z-10 max-w-6xl mx-auto px-6">

            {/* ── INTRO ROW ── */}
            <div className="flex flex-col lg:flex-row items-center gap-14 mb-28">
              
              <div className="flex-1 scroll-reveal" style={{ animationDelay: '100ms' }}>
                <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/8 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>New Feature · Soundie AI</span>
                </div>
                <h2 className="text-4xl md:text-5xl  font-black tracking-tight mb-5 leading-none" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Meet{' '}
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)' }}>Soundie</span>
                </h2>
                <p className="text-[15px] md:text-base text-zinc-400 max-w-lg mb-7 leading-relaxed" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  The voice-activated neural core of your SoundWave library. Speak naturally, type casually — she understands, remembers context, and acts instantly. Zero hands required.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {[
                    { text: 'play Blinding Lights', color: '#f97316' },
                    { text: 'create playlist Focus', color: '#8b5cf6' },
                    { text: 'enable 8D audio', color: '#ec4899' },
                    { text: 'sleep in 30 minutes', color: '#06b6d4' },
                    { text: "what's playing?", color: '#10b981' },
                  ].map((p, i) => <CapabilityPill key={i} {...p} />)}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/download"
                    className="inline-flex w-full md:w-auto items-center gap-2 px-7 py-3.5 rounded-xl text-black font-bold text-sm transition-all hover:scale-105"
                    style={{ background: '#fff', boxShadow: '0 0 40px rgba(249,115,22,0.3),0 4px 20px rgba(0,0,0,0.4)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    Download to Try Soundie <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
              <span className='hidden md:block'><SoundieOrb size={240} /></span>
              <span className='md:hidden'><SoundieOrb size={180} /></span>
            </div>

            {/* ── LIVE TERMINAL ── */}
            <div className="mb-24 scroll-reveal" style={{ animationDelay: '0ms' }}>
              <div className="mb-8">
                <p className="text-[11px] uppercase tracking-widest text-orange-400/60 mb-2 font-mono">See it in action</p>
                <h3 className="text-2xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Every Command,{' '}
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#f97316,#8b5cf6)' }}>Executed Instantly</span>
                </h3>
                <p className="text-zinc-500 text-sm">Natural language, typos, casual phrasing — Soundie handles all of it without missing a beat.</p>
              </div>
              <SoundieTerminal />
            </div>

            {/* ── 6-CAPABILITY GRID ── */}
            <div className="mb-16">
              <div className="mb-8">
                <p className="text-[11px] uppercase tracking-widest text-purple-400/60 font-mono mb-2 scroll-reveal">Core Engine</p>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight scroll-reveal" style={{ fontFamily: 'Syne, sans-serif', animationDelay: '100ms' }}>What She Can Do</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: Play,       accent: '#f97316', title: 'Play, Pause, Skip',     desc: 'Full transport control. Resume from where you left off. Go back to the previous track instantly.', cmds: ['"Play"', '"Skip"', '"Previous track"'] },
                  { icon: Music,      accent: '#8b5cf6', title: 'Search Your Library',   desc: 'Ask by title or artist. High-confidence matches play instantly. Typo-safe search included.',        cmds: ['"Play Blinding Lights"', '"Put on some Weeknd"'] },
                  { icon: ListMusic,  accent: '#10b981', title: 'Playlist Management',   desc: 'Create, populate, and delete playlists. Guarded by confirmation for all destructive actions.',       cmds: ['"Create playlist Focus"', '"Add this to Chill mix"'] },
                  { icon: Volume2,    accent: '#06b6d4', title: 'Volume & Brightness',   desc: 'Hardware-level native controls via Capacitor plugins. Say a percentage or just say "louder".',      cmds: ['"Set volume to 60%"', '"Dim the screen"'] },
                  { icon: Zap,        accent: '#ec4899', title: '8D Spatial Audio',      desc: 'Toggle the psychoacoustic engine that makes tracks orbit your head in three-dimensional space.',   cmds: ['"Enable 8D audio"', '"Turn off spatial mode"'] },
                  { icon: Clock,      accent: '#fbbf24', title: 'Sleep Timer',            desc: 'Tell Soundie when to stop. She sets a clean countdown and stops music gracefully when it expires.',cmds: ['"Sleep in 30 minutes"', '"Stop music in 1 hour"'] },
                ].map(({ icon: Icon, accent, title, desc, cmds }, i) => (
                  <div key={i} className="soundie-card p-5 group scroll-reveal" style={{ animationDelay: `${i * 75}ms` }}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at 50% 0%,${accent}18 0%,transparent 65%)` }} />
                    <div className="relative z-10">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 border border-white/8"
                        style={{ background: `${accent}18`, color: accent }}><Icon size={18} /></div>
                      <h4 className="text-sm font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</h4>
                      <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">{desc}</p>
                      <div className="space-y-1.5">
                        {cmds.map((c, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span style={{ color: accent }} className="text-[10px] opacity-60 font-mono">›</span>
                            <span className="text-[11px] font-mono text-white/45">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SMART ENGINE ROW ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {/* Typo Engine */}
              <div className="soundie-card p-5 scroll-reveal" style={{ animationDelay: '0ms' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/20" style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}><Search size={18} /></div>
                <h4 className="text-sm font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Levenshtein Typo Engine</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">Up to 2 character errors allowed. She finds what you meant, not what you typed.</p>
                <div className="rounded-xl border border-white/8 p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="text-[10px] uppercase tracking-widest text-orange-400/60 font-mono mb-2">Typo → Match</div>
                  <div className="text-[12px] text-zinc-500 line-through font-mono mb-1">"Blinding Liths"</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-emerald-400 font-mono">Blinding Lights</span>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">matched</span>
                  </div>
                </div>
              </div>
              {/* Context Memory */}
              <div className="soundie-card p-5 scroll-reveal" style={{ animationDelay: '100ms' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/20" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><BrainCircuit size={18} /></div>
                <h4 className="text-sm font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Multi-Turn Context Memory</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">Tracks conversation state. Waits for your yes/no without forgetting what she asked.</p>
                <div className="space-y-2 text-[11.5px] font-mono">
                  {[
                    { who: 'you', text: 'delete Workout mix', color: 'text-zinc-400' },
                    { who: 'soundie', text: '⚠ Sure? Cannot be undone.', color: 'text-orange-400' },
                    { who: 'you', text: 'yeah', color: 'text-zinc-400' },
                    { who: 'soundie', text: '🗑 Deleted permanently.', color: 'text-red-400' },
                  ].map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.who === 'soundie' ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[9px] text-zinc-700 uppercase tracking-widest self-end flex-shrink-0">{m.who}</span>
                      <span className={`px-2.5 py-1 rounded-xl border border-white/6 ${m.color}`} style={{ background: 'rgba(255,255,255,0.03)' }}>{m.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Voice + TTS */}
              <div className="soundie-card p-5 scroll-reveal" style={{ animationDelay: '200ms' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/20" style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}><Mic size={18} /></div>
                <h4 className="text-sm font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Voice + Neural TTS</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">Speak or type mid-session. Soundie talks back via neural speech — the orb pulses in real time with her voice.</p>
                <WaveformViz />
                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-[10px] border border-orange-500/20 text-orange-400/70 font-mono">Voice · Native</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] border border-zinc-700 text-zinc-500 font-mono">Text · Keyboard</span>
                </div>
              </div>
            </div>

            {/* ── SAFETY BANNER ── */}
            <div className="scroll-reveal rounded-3xl border border-emerald-500/15 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start mb-4" style={{ background: 'rgba(16,185,129,0.04)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}><Shield size={22} /></div>
              <div>
                <h4 className="text-base font-bold mb-2 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Built-in Content Safety</h4>
                <p className="text-[12.5px] text-zinc-500 leading-relaxed max-w-2xl">
                  Soundie runs an explicit content filter on every input before processing. Inappropriate language is blocked with a polite redirect. Destructive actions like playlist deletion are locked behind a mandatory confirmation gate — she never acts unless you explicitly say yes.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Fade back to dark */}
        <div className="h-20 bg-gradient-to-t from-[#030303] to-transparent absolute bottom-0 left-0 right-0 z-20 pointer-events-none" />
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section id="how-it-works" ref={howItWorksRef.elementRef} className={`relative z-10 max-w-5xl mx-auto px-6 py-20 border-t border-white/5 ${howItWorksRef.isVisible ? 'is-visible' : ''}`}>
        <div className="text-center mb-14 scroll-reveal">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-zinc-900 border border-white/10">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">Simple Setup</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Up and running in <span className="text-gradient-accent">3 steps</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <div key={i} className="bento-card p-7 scroll-reveal group" style={{ animationDelay: `${i * 150}ms` }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Icon size={18} className={color} /></div>
                  <span className="text-xs font-bold text-zinc-600 tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>0{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ BENTO ══════ */}
      <section ref={bentoRef.elementRef} className={`relative z-10 max-w-5xl mx-auto px-6 py-16 border-t border-white/5 ${bentoRef.isVisible ? 'is-visible' : ''}`}>
        <div className="text-center mb-10 scroll-reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Everything you need.<br />Nothing you don't.</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">A purpose-built suite of audio tools that work together seamlessly.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]">
          <div className="bento-card md:col-span-2 md:row-span-2 p-8 flex flex-col justify-between group scroll-reveal" style={{ animationDelay: '100ms' }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-colors" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-5"><Headphones size={22} className="text-indigo-400" /></div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Spatial 8D Engine</h3>
              <p className="text-zinc-400 max-w-sm text-sm leading-relaxed">Toggle hardware-accelerated Web Audio panning to make your tracks physically orbit your head. Like sitting in the middle of a live studio.</p>
            </div>
            <div className="w-full h-24 mt-6 flex items-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity relative z-10">
              {[...Array(40)].map((_, i) => <div key={i} className="flex-1 bg-indigo-500/50 rounded-t-[1px]" style={{ height: `${Math.random() * 100}%` }} />)}
            </div>
          </div>
          <div className="bento-card p-6 group scroll-reveal animate-bg-shift bg-gradient-to-br from-indigo-900/20 via-zinc-900/60 to-purple-900/20" style={{ animationDelay: '200ms' }}>
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-4"><Palette size={18} className="text-white" /></div>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Advance Theming</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">The UI extracts colors from album art in real-time, morphing shadows and buttons to match.</p>
          </div>
          <div className="bento-card p-6 group scroll-reveal" style={{ animationDelay: '300ms' }}>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-4"><CloudUpload size={18} className="text-cyan-400" /></div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Cloud Sync</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Drag, drop, and play. Custom MP3s and metadata are securely synced instantly.</p>
            </div>
          </div>
          <div className="bento-card md:col-span-3 p-8 flex flex-col md:flex-row items-center justify-between gap-8 group scroll-reveal" style={{ animationDelay: '400ms' }}>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center"><Mic2 size={18} className="text-white" /></div>
                <span className="px-2.5 py-1.5 rounded-lg bg-gray-500/20 text-indigo-400 text-[8px] font-bold uppercase tracking-wider border border-indigo-500/30">Development Phase</span>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Ghost Lyrics Interface</h3>
              <p className="text-sm text-zinc-400 max-w-md leading-relaxed">A full-screen `.lrc` engine with Apple-style blurred backgrounds to bring your library to life.</p>
            </div>
            <div className="flex-1 w-full min-h-[100px] bg-black/50 rounded-xl p-5 border border-white/5 font-bold text-base md:text-lg leading-relaxed text-center opacity-60 group-hover:opacity-100 transition-opacity flex flex-col justify-center">
              <div className="text-white/30 blur-[1px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>A new way to see music...</div>
              <div className="text-white scale-105 my-2 drop-shadow-xl text-gradient" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>The Interface of v2.0</div>
              <div className="text-white/30 blur-[1px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Coming to your library.</div>
            </div>
          </div>
          
        </div>
      </section>

      {/* ══════ TESTIMONIALS ══════ */}
      <section ref={testimonialsRef.elementRef} className={`relative z-10 max-w-5xl mx-auto px-6 py-20 border-t border-white/5 ${testimonialsRef.isVisible ? 'is-visible' : ''}`}>
        <div className="text-center mb-12 scroll-reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Loved by music fans</h2>
          <p className="text-sm text-zinc-500">Real reactions from our beta community.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TestimonialCard quote="Finally a music player that feels built for people who actually care about their collection. The 8D audio is insane." author="Riya M." role="Beta Tester · Music Producer" delay="100ms" />
          <TestimonialCard quote="Soundie is magic. I said 'create playlist Focus and add Levitating' and it just... worked. Voice control actually working." author="Arjun K." role="Beta Tester · DJ & Collector" delay="200ms" />
          <TestimonialCard quote="No ads. No Spotify Connect nonsense. No shuffle that plays the same 10 songs. Just my music, beautifully." author="Priya S." role="Beta Tester · Audiophile" delay="300ms" />
        </div>
      </section>

      {/* ══════ FAQ ══════ */}
      <section id="faq" ref={faqRef.elementRef} className={`relative z-10 max-w-2xl mx-auto px-6 py-16 border-t border-white/5 ${faqRef.isVisible ? 'is-visible' : ''}`}>
        <div className="text-center mb-10 scroll-reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Frequently Asked Questions</h2>
          <p className="text-zinc-400 text-sm">Everything you need to know about the platform.</p>
        </div>
        <div className="space-y-3 scroll-reveal" style={{ animationDelay: '200ms' }}>
          {faqs.map((faq, index) => (
            <div key={index} className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-white/15">
              <button className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors" onClick={() => toggleFAQ(index)}>
                <span className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{faq.q}</span>
                <ChevronDown size={18} className={`text-zinc-500 transition-transform duration-300 flex-shrink-0 ml-4 ${openFAQ === index ? 'rotate-180' : ''}`} />
              </button>
              <div className={`px-5 text-sm text-zinc-400 leading-relaxed transition-all duration-300 ease-in-out ${openFAQ === index ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>{faq.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ BOTTOM CTA ══════ */}
      <section ref={ctaRef.elementRef} className={`relative z-10 max-w-3xl mx-auto px-6 py-20 text-center ${ctaRef.isVisible ? 'is-visible' : ''}`}>
        <div className="glass-panel p-10 rounded-[3rem] relative overflow-hidden scroll-reveal">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-indigo-500/10 to-transparent rotate-12 pointer-events-none" />
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border border-indigo-500/10 animate-spin-slow" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full border border-purple-500/10 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Drop the algorithm.</h2>
          <p className="text-zinc-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">Take control of your listening experience. No ads, no forced recommendations. Just your music — and Soundie by your side.</p>
          <Link to="/signup" style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            className="inline-flex items-center gap-2 bg-white text-black px-10 py-4 rounded-2xl text-sm font-bold hover:scale-[102%] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            Create Free Account <ArrowRight size={14} className="mb-[1px]" />
          </Link>
          <p className="text-xs text-zinc-600 mt-4">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="relative z-10 border-t border-white/5 bg-black">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8"><img src={Logo} alt="SoundWave Logo" className="w-full h-full object-contain" /></div>
                <span className="text-base font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SoundWave</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mb-5">A personal cloud music player built for audiophiles. Upload, customize, and experience your music — with Soundie AI at your command.</p>
              <div className="flex items-center gap-3">
                {[Twitter, Github, Instagram, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.03] flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/15 transition-all"><Icon size={14} /></a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Product</p>
              <ul className="space-y-2.5">{['Features','Soundie AI','Changelog','Download'].map(l => <li key={l}><a href="#" className="footer-link" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{l}</a></li>)}</ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Company</p>
              <ul className="space-y-2.5">{['About Us','Blog','Press Kit','Contact'].map(l => <li key={l}><a href="#" className="footer-link" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{l}</a></li>)}</ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Legal</p>
              <ul className="space-y-2.5">{['Privacy Policy','Terms of Service','Cookie Policy','DMCA Policy','Acceptable Use'].map(l => <li key={l}><a href="#" className="footer-link" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{l}</a></li>)}</ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-600 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>© 2026 SoundWave. Built for the love of the craft.</p>
            <div className="flex items-center gap-5">
              {['Privacy','Terms','Cookies'].map(l => <a key={l} href="#" className="footer-link" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{l}</a>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing