import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParticleScene, HoverInfo } from '../components/ParticleScene';
import { fetchNasaData, NeoAsteroid } from '../utils/nasaApi';

// ── Physics ────────────────────────────────────────────────────────────────
function calcYield(a: NeoAsteroid) {
  const r  = (a.estimatedDiameterKm * 1000) / 2;
  const V  = (4 / 3) * Math.PI * r ** 3;
  const m  = V * 3000;
  const v  = a.relativeVelocityKmh / 3.6;
  const J  = 0.5 * m * v ** 2;
  const mt = J / 4.184e15;
  return { mt, label: mt >= 1000 ? `${(mt / 1000).toFixed(2)} GT` : mt >= 0.01 ? `${mt.toFixed(2)} MT` : `${(mt * 1000).toFixed(3)} KT` };
}

function riskLevel(a: NeoAsteroid): { label: string; color: string; desc: string } {
  const ld = a.missDistanceKm / 384400;
  const dm = a.estimatedDiameterKm * 1000;
  if (dm > 1000 && ld < 10)  return { label: 'CRITICAL', color: '#ff4020', desc: 'Extinction-class proximity — continuous monitoring.' };
  if (dm > 140 && ld < 20)   return { label: 'ELEVATED', color: '#ff8040', desc: 'PHO-class object at close range. Tracked by CNEOS.' };
  if (dm > 50 && ld < 50)    return { label: 'MODERATE', color: '#ffa040', desc: 'City-scale threat potential. Warrants observation.' };
  return                             { label: 'LOW',      color: '#40c080', desc: 'No immediate concern. Consistent with historical norms.' };
}

const REFS = [
  { label: 'Hiroshima',     mt: 0.000015 },
  { label: 'Chelyabinsk',  mt: 0.5      },
  { label: 'Castle Bravo', mt: 15       },
  { label: 'Tsar Bomba',   mt: 50       },
];

// ── Drifting star field for overlay backdrop ───────────────────────────────
function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf: number;
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 0.9 + 0.2,
      s: (Math.random() - 0.5) * 0.00012,
      o: Math.random() * 0.45 + 0.08,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        s.x = (s.x + s.s + 1) % 1;
        ctx.beginPath();
        ctx.arc(s.x * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,190,${s.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── Kinetic Impact Overlay ─────────────────────────────────────────────────
function KineticOverlay({ a, onClose }: { a: NeoAsteroid; onClose: () => void }) {
  const { mt, label } = calcYield(a);
  const risk  = riskLevel(a);
  const diamM = (a.estimatedDiameterKm * 1000).toFixed(0);
  const ld    = (a.missDistanceKm / 384400);
  const au    = (a.missDistanceKm / 149597870).toFixed(4);
  const kms   = (a.relativeVelocityKmh / 3600).toFixed(2);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden flex flex-col" style={{ fontFamily: "'Satoshi-Variable', sans-serif" }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,2,2,0.84)' }} />
      <div className="absolute inset-0 backdrop-blur-sm pointer-events-none" />
      <StarField />

      <div className="relative flex flex-col h-full">
        {/* Header */}
        <header className="shrink-0 px-8 py-4 flex items-center gap-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="liquid-glass rounded-full px-4 py-1.5 text-white/50 hover:text-white text-xs tracking-widest uppercase transition-all"
          >
            ← Back
          </button>
          <div className="flex-1 flex items-baseline gap-3 min-w-0">
            <h2 className="text-white font-bold truncate" style={{ fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
              {a.name}
            </h2>
            {a.isPotentiallyHazardous && (
              <span className="liquid-glass rounded-full px-3 py-0.5 text-white/50 text-[9px] tracking-widest uppercase shrink-0">PHO</span>
            )}
            {/* Risk badge */}
            <span
              className="rounded-full px-3 py-0.5 text-[9px] font-bold tracking-widest uppercase shrink-0 border"
              style={{ color: risk.color, borderColor: risk.color + '40', background: risk.color + '12' }}
            >
              {risk.label}
            </span>
          </div>
          <span className="text-white/15 font-mono text-[10px] tracking-widest uppercase hidden md:block">Impact Analysis</span>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-5 p-5 overflow-hidden">

          {/* LEFT */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <div className="liquid-glass-strong rounded-2xl p-5 flex flex-col gap-1">
                <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase">Proximity</div>
                <div className="font-bold" style={{ fontSize: '1.9rem', letterSpacing: '-0.02em', lineHeight: 1, color: '#67e8f9' }}>
                  {ld.toFixed(2)}
                </div>
                <div className="text-white/25 font-mono text-[9px]">Lunar Distances</div>
                <div className="text-white/20 font-mono text-[9px]">{au} AU</div>
              </div>
              <div className="liquid-glass-strong rounded-2xl p-5 flex flex-col gap-1">
                <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase">Size</div>
                <div className="text-white font-bold" style={{ fontSize: '1.9rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {diamM}
                </div>
                <div className="text-white/25 font-mono text-[9px]">Meters · {kms} km/s</div>
              </div>
            </div>

            {/* Yield */}
            <div className="liquid-glass-strong rounded-2xl p-5 shrink-0">
              <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase mb-1">Kinetic Yield</div>
              <div className="font-bold" style={{ fontSize: '2.6rem', letterSpacing: '-0.02em', lineHeight: 1, color: '#fb923c' }}>
                {label}
              </div>
              <div className="text-white/20 font-mono text-[9px] mt-1">E = ½mv² · ρ = 3,000 kg/m³</div>
            </div>

            {/* Comparison */}
            <div className="liquid-glass rounded-2xl p-5 flex-1 min-h-0 flex flex-col">
              <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase mb-3">Compared to</div>
              <div className="flex flex-col gap-2 flex-1">
                {REFS.map(({ label: rl, mt: rmt }) => {
                  const ratio = mt / rmt;
                  const barPct = Math.min(100, Math.log10(ratio + 1) / Math.log10(1001) * 100);
                  return (
                    <div key={rl} className="flex items-center gap-3">
                      <div className="text-white/35 text-xs flex-1">{rl}</div>
                      <div className="h-[2px] flex-[2] rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded transition-all" style={{ width: `${barPct}%`, background: 'linear-gradient(to right,rgba(251,146,60,0.7),rgba(251,146,60,0.2))' }} />
                      </div>
                      <div className="text-white/50 font-mono text-[10px] w-16 text-right">
                        {ratio >= 1000 ? `${(ratio / 1000).toFixed(1)}k×` : ratio >= 1 ? `${ratio.toFixed(1)}×` : `${(1 / ratio).toFixed(0)}× less`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

            {/* Verdict / Consensus */}
            <div className="liquid-glass-strong rounded-2xl p-5 shrink-0 border" style={{ borderColor: risk.color + '25' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase">Threat Consensus</div>
                <div className="h-px flex-1" style={{ background: risk.color + '30' }} />
                <span className="font-bold text-[10px] tracking-widest" style={{ color: risk.color }}>{risk.label}</span>
              </div>
              <p className="text-white/55 text-sm leading-relaxed mb-4">{risk.desc}</p>

              {/* Impact probability context */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-white/20 font-mono text-[9px] uppercase tracking-widest mb-0.5">Impact Probability</div>
                  <div className="text-white/70 text-sm font-medium">
                    {ld < 1 ? '< 0.001%' : ld < 5 ? 'Negligible' : 'Effectively zero'}
                  </div>
                </div>
                <div>
                  <div className="text-white/20 font-mono text-[9px] uppercase tracking-widest mb-0.5">Damage Class</div>
                  <div className="text-white/70 text-sm font-medium">
                    {parseFloat(diamM) > 1000 ? 'Global'
                      : parseFloat(diamM) > 300 ? 'Regional'
                      : parseFloat(diamM) > 50  ? 'Local'
                      : 'Atmospheric'}
                  </div>
                </div>
              </div>

              {/* Defense mechanisms */}
              <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="text-white/20 font-mono text-[9px] uppercase tracking-widest mb-2">Active Defenses</div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'DART Protocol', desc: 'Kinetic impactor — proven Feb 2022' },
                    { label: 'CNEOS Tracking', desc: `${a.name} is catalogued & monitored` },
                    { label: 'Early Warning', desc: '10+ year lead time for objects this size' },
                  ].map(({ label: dl, desc }) => (
                    <div key={dl} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: '#fb923c' }} />
                      <div>
                        <span className="text-white/55 text-xs font-medium">{dl}</span>
                        <span className="text-white/25 text-xs"> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glossary */}
            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
              {[
                { term: 'LD', full: 'Lunar Distance', value: '384,400 km',
                  body: `This object passes at ${ld.toFixed(1)} LD — ${ld < 10 ? 'within close-approach range but safely beyond the Moon' : 'well outside monitoring thresholds'}.` },
                { term: 'AU', full: 'Astronomical Unit', value: '149,597,870 km',
                  body: `At ${au} AU — ${parseFloat(au) < 0.05 ? 'within PHO monitoring range (0.05 AU threshold)' : 'outside the PHO boundary'}.` },
                { term: a.isPotentiallyHazardous ? 'PHO ✓' : 'PHO ✗', full: 'Potentially Hazardous Object', value: '>140m & <0.05 AU',
                  body: a.isPotentiallyHazardous
                    ? 'Meets PHO criteria. Catalogued and tracked continuously by NASA CNEOS. PHO ≠ imminent threat.'
                    : 'Does not meet PHO criteria. Too small, too distant, or both. No escalated tracking needed.' },
              ].map(({ term, full, value, body }) => (
                <div key={term} className="liquid-glass rounded-2xl p-4 flex-1 min-h-0">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-white font-bold text-base" style={{ letterSpacing: '-0.02em' }}>{term}</span>
                    <span className="text-white/30 text-[10px]">{full}</span>
                    <span className="ml-auto text-white/15 font-mono text-[9px]">{value}</span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Infinite Swipe Carousel ────────────────────────────────────────────────
const CARDS = [
  { date: 'Feb 15, 2013', title: 'Chelyabinsk', body: 'A 20-meter asteroid entered Russia\'s atmosphere completely undetected — 30× Hiroshima\'s energy. It came from the sun\'s blind spot, too small to track. 1,500 injuries from shockwave-shattered glass.', meta: '~20m · 0 km miss · Undetected' },
  { date: 'Reading the Graph', title: 'The Empty Danger Zone', body: 'The scatter plot\'s top-left quadrant — large and close — is completely empty. Not a gap in data. Every extinction-class asteroid is catalogued, tracked, and confirmed safe for the next 100 years.', meta: 'Source: NASA CNEOS' },
  { date: 'Sep 26, 2022', title: 'DART Mission', body: 'NASA deliberately smashed a spacecraft into the 160m moonlet Dimorphos, changing its orbital period by 33 minutes. Kinetic impactor deflection confirmed by Hubble and Webb. We can act.', meta: '33 min orbital change · Confirmed' },
];

function NarrativeCarousel() {
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const go = (dir: 1 | -1) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setIdx((i) => (i + dir + CARDS.length) % CARDS.length);
      setAnimating(false);
    }, 220);
  };

  const card = CARDS[idx];

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="liquid-glass-strong rounded-3xl p-8 max-w-2xl w-full mx-auto transition-all duration-200"
        style={{ opacity: animating ? 0 : 1, transform: animating ? 'scale(0.97)' : 'scale(1)' }}
      >
        <p className="text-white/25 font-mono text-[10px] tracking-[0.3em] uppercase mb-3">{card.date}</p>
        <h3 className="text-white font-bold text-xl mb-4" style={{ letterSpacing: '-0.02em' }}>{card.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed mb-6">{card.body}</p>
        <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-white/15 font-mono text-[9px] tracking-widest uppercase">{card.meta}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <button onClick={() => go(-1)} className="liquid-glass rounded-full w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors text-sm">←</button>
        {CARDS.map((_, i) => (
          <button key={i} onClick={() => { if (!animating && i !== idx) { setAnimating(true); setTimeout(() => { setIdx(i); setAnimating(false); }, 220); } }}
            className="rounded-full transition-all duration-300"
            style={{ width: i === idx ? 20 : 6, height: 6, background: i === idx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }}
          />
        ))}
        <button onClick={() => go(1)} className="liquid-glass rounded-full w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors text-sm">→</button>
      </div>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [hoverInfo,        setHoverInfo]        = useState<HoverInfo | null>(null);
  const [selectedAsteroid, setSelectedAsteroid] = useState<NeoAsteroid | null>(null);
  const [nasaData,         setNasaData]         = useState<NeoAsteroid[]>([]);
  const [activeTimeline,   setActiveTimeline]   = useState('current');
  const [timelineLoading,  setTimelineLoading]  = useState(false);

  useEffect(() => { fetchNasaData().then(setNasaData); }, []);

  useEffect(() => {
    document.body.style.overflow = selectedAsteroid ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedAsteroid]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedAsteroid(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const loadDate = useCallback(async (startDate: string | undefined, id: string) => {
    if (id === activeTimeline || timelineLoading) return;
    setActiveTimeline(id);
    setTimelineLoading(true);
    try { setNasaData(await fetchNasaData(startDate)); }
    finally { setTimelineLoading(false); }
  }, [activeTimeline, timelineLoading]);

  const loadCustomDate = useCallback(async (isoDate: string) => {
    setActiveTimeline('custom');
    setTimelineLoading(true);
    try { setNasaData(await fetchNasaData(isoDate)); }
    finally { setTimelineLoading(false); }
  }, []);

  return (
    <main className="relative w-full text-white selection:bg-cyan-500/30" style={{ fontFamily: "'Satoshi-Variable', sans-serif" }}>
      <ParticleScene
        onHover={setHoverInfo}
        onClickAsteroid={setSelectedAsteroid}
        nasaData={nasaData}
        clickEnabled={!selectedAsteroid}
      />

      {/* ── Hover HUD ──────────────────────────────────────────── */}
      {hoverInfo && !selectedAsteroid && (
        <div
          className="fixed z-50 pointer-events-none liquid-glass-strong rounded-2xl p-5 w-72"
          style={{ left: hoverInfo.x + 20, top: hoverInfo.y + 20 }}
        >
          <div className="flex justify-between items-start border-b pb-2 mb-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="text-white font-semibold text-sm leading-tight" style={{ letterSpacing: '-0.01em' }}>{hoverInfo.data.name}</div>
            {hoverInfo.data.isPotentiallyHazardous && (
              <div className="liquid-glass text-white/50 text-[8px] px-2 py-0.5 rounded-full ml-2 shrink-0 uppercase tracking-widest">PHO</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-2.5">
            <span className="text-white/30 text-[10px] uppercase tracking-widest">Diameter</span>
            <span className="text-right text-white/80 text-xs font-medium">
              {hoverInfo.data.estimatedDiameterKm >= 1
                ? `${hoverInfo.data.estimatedDiameterKm.toFixed(2)} km`
                : `${(hoverInfo.data.estimatedDiameterKm * 1000).toFixed(0)} m`}
            </span>
            <span className="text-white/30 text-[10px] uppercase tracking-widest">Miss Distance</span>
            <div className="text-right flex flex-col gap-0.5">
              <span className="text-white/80 text-xs font-medium">{(hoverInfo.data.missDistanceKm / 384400).toFixed(2)} LD</span>
              <span className="text-white/25 text-[9px]">{(hoverInfo.data.missDistanceKm / 149597870).toFixed(4)} AU</span>
            </div>
            <span className="text-white/30 text-[10px] uppercase tracking-widest">Velocity</span>
            <span className="text-right text-white/80 text-xs font-medium">{(hoverInfo.data.relativeVelocityKmh / 3600).toFixed(2)} km/s</span>
          </div>
          <div className="mt-3 pt-2 border-t text-[9px] text-white/15 uppercase tracking-widest" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            Click to analyse
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full px-8 py-5 flex justify-between items-center z-[100] pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, rgba(5,2,2,0.6) 0%, transparent 100%)' }}>
        <div className="font-bold tracking-widest text-sm uppercase text-white/70">The Threat Matrix</div>
        <div className="hidden md:block text-[10px] tracking-[0.3em] uppercase text-white/20">NASA NEO API</div>
      </nav>

      {/* ── 300vh Scroll Container ─────────────────────────────── */}
      <div className="relative z-10 w-full flex flex-col" style={{ height: '300vh' }}>

        {/* Phase 0: Earth */}
        <section className="h-screen flex flex-col justify-center items-start px-12 md:px-24 pointer-events-none">
          <div className="liquid-glass-strong rounded-3xl p-8 max-w-xl pointer-events-auto">
            <h1 className="font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400"
                style={{ fontSize: '3.2rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Our Pale<br />Blue Dot.
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              Hover over the globe. Scroll to reveal what's out there.
            </p>
          </div>
        </section>

        {/* Phase 1: Swarm */}
        <section className="h-screen flex flex-col justify-center items-end px-12 md:px-24 pointer-events-none">
          <div className="liquid-glass-strong rounded-3xl p-8 max-w-xl text-right pointer-events-auto">
            {/* Orange accent on the dramatic word */}
            <h2 className="font-bold mb-4" style={{ fontSize: '3.2rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              The <span style={{ color: '#fb923c' }}>Swarm</span><br />Approaches.
            </h2>
            <p className="text-white/50 text-lg leading-relaxed">
              36,000+ near-Earth objects tracked. Media suggests constant danger. The data disagrees.
            </p>
          </div>
        </section>

        {/* Phase 2: Graph + Timeline */}
        <section className="h-screen relative pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/30 font-mono text-[10px] tracking-widest uppercase">
              Live NASA data · hover to inspect · <span style={{ color: '#fb923c' }}>click</span> to analyse
            </p>
          </div>

          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/15 font-mono text-[10px] tracking-widest uppercase">
            Miss Distance →
          </div>
          <div className="absolute left-6 top-1/2 text-white/15 font-mono text-[10px] tracking-widest uppercase"
               style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}>
            Diameter →
          </div>

          {/* ── Timeline — single glass layer ── */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4 pointer-events-auto">
            <div className="liquid-glass rounded-full px-2 py-2 flex flex-wrap justify-center gap-1 items-center max-w-3xl">
              <span className="text-white/20 text-[10px] font-mono uppercase tracking-widest px-3 hidden md:block">
                {timelineLoading ? '…' : 'Era'}
              </span>

              {[
                { id: 'current',     label: 'This Week',         date: undefined    },
                { id: 'chelyabinsk', label: 'Chelyabinsk 2013', date: '2013-02-11' },
                { id: 'apophis',     label: 'Apophis 2029',      date: '2029-04-07' },
              ].map((tl) => (
                <button
                  key={tl.id}
                  onClick={() => loadDate(tl.date, tl.id)}
                  disabled={timelineLoading}
                  className="rounded-full px-4 py-1.5 text-[11px] font-medium tracking-wide transition-all"
                  style={{
                    background: activeTimeline === tl.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: activeTimeline === tl.id ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                    boxShadow: activeTimeline === tl.id ? 'inset 0 1px 1px rgba(255,255,255,0.15)' : 'none',
                  }}
                >
                  {tl.label}
                </button>
              ))}

              <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <label htmlFor="custom-date" className="text-[10px] text-white/20 uppercase tracking-widest cursor-pointer">Date:</label>
                <input
                  type="date"
                  id="custom-date"
                  disabled={timelineLoading}
                  className="bg-transparent text-white/50 text-[11px] font-medium focus:outline-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                  onChange={(e) => { if (e.target.value) loadCustomDate(e.target.value); }}
                  onWheel={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {nasaData.length > 0 && (
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-white/15 font-mono text-[9px]">
                {nasaData.length} objects · <span style={{ color: 'rgba(251,146,60,0.6)' }}>{nasaData.filter(a => a.isPotentiallyHazardous).length} PHO</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Narrative Section ──────────────────────────────────── */}
      <section className="relative z-20 w-full min-h-screen pt-24 pb-20" style={{ background: '#0a0505' }}>
        <div className="max-w-2xl mx-auto px-8 mb-16 text-center">
          <p className="text-white/20 font-mono text-[10px] tracking-[0.5em] uppercase mb-5">The Science</p>
          <h2 className="text-white font-bold mb-5" style={{ fontSize: '2.4rem', letterSpacing: '-0.03em' }}>
            The Reality of <span style={{ color: '#fb923c' }}>Planetary Defense</span>
          </h2>
          <p className="text-white/35 text-base max-w-lg mx-auto leading-relaxed">
            The graph looks empty because space is staggeringly vast. That emptiness is the point.
          </p>
        </div>

        {/* Infinite wrap carousel */}
        <NarrativeCarousel />

        <div className="max-w-xl mx-auto px-8 mt-20 text-center">
          <p className="text-white/20 text-sm leading-relaxed">
            Live data from{' '}
            <a href="https://api.nasa.gov/" target="_blank" rel="noopener noreferrer"
               className="text-white/35 underline underline-offset-4 hover:text-white/55 transition-colors">
              NASA NeoWs API
            </a>
          </p>
        </div>
      </section>

      {/* ── Kinetic Impact Overlay ─────────────────────────────── */}
      {selectedAsteroid && (
        <KineticOverlay a={selectedAsteroid} onClose={() => setSelectedAsteroid(null)} />
      )}
    </main>
  );
}
