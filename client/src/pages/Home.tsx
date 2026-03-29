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

const REFS = [
  { label: 'Hiroshima',      mt: 0.000015 },
  { label: 'Chelyabinsk',   mt: 0.5      },
  { label: 'Castle Bravo',  mt: 15       },
  { label: 'Tsar Bomba',    mt: 50       },
];

// ── Mini floating-particle canvas for overlay backdrop ──────────────────────
function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf: number;
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 0.8 + 0.3,
      s: (Math.random() - 0.5) * 0.00015,
      o: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        s.x = (s.x + s.s + 1) % 1;
        ctx.beginPath();
        ctx.arc(s.x * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,200,${s.o})`;
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
  const diamM = (a.estimatedDiameterKm * 1000).toFixed(0);
  const ld    = (a.missDistanceKm / 384400).toFixed(2);
  const au    = (a.missDistanceKm / 149597870).toFixed(4);
  const kms   = (a.relativeVelocityKmh / 3600).toFixed(2);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden flex flex-col" style={{ fontFamily: "'Satoshi-Variable', sans-serif" }}>
      {/* ── Background layers ── */}
      {/* Semi-transparent dark layer — lets WebGL particles bleed through */}
      <div className="absolute inset-0" style={{ background: 'rgba(5,2,2,0.82)' }} />
      {/* Subtle backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-sm pointer-events-none" />
      {/* Drifting star field */}
      <StarField />

      {/* ── Content (no scrolling — everything fits in 100vh) ── */}
      <div className="relative flex flex-col h-full">

        {/* Header */}
        <header className="shrink-0 px-8 py-5 flex items-center gap-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="liquid-glass rounded-full px-4 py-2 text-white/60 hover:text-white text-xs tracking-widest uppercase transition-all hover:text-white"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            ← Back
          </button>
          <div className="flex-1 flex items-baseline gap-4 min-w-0">
            <h2 className="text-white font-bold truncate" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
              {a.name}
            </h2>
            {a.isPotentiallyHazardous && (
              <span className="liquid-glass rounded-full px-3 py-0.5 text-white/70 text-[10px] tracking-widest uppercase shrink-0">
                PHO
              </span>
            )}
          </div>
          <span className="text-white/20 font-mono text-[10px] tracking-widest uppercase hidden md:block">
            Impact Analysis
          </span>
        </header>

        {/* Body — 2-col grid, fills remaining height */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-hidden">

          {/* ── LEFT: Stats ── */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

            {/* Row 1: Proximity + Scale side by side */}
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <div className="liquid-glass-strong rounded-2xl p-5 flex flex-col gap-1" style={{ minHeight: 0 }}>
                <div className="text-white/30 font-mono text-[9px] tracking-widest uppercase">Proximity</div>
                <div className="text-cyan-300 font-bold" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{ld}</div>
                <div className="text-white/30 font-mono text-[9px]">Lunar Distances</div>
                <div className="text-white/20 font-mono text-[9px] mt-1">{au} AU</div>
              </div>
              <div className="liquid-glass-strong rounded-2xl p-5 flex flex-col gap-1" style={{ minHeight: 0 }}>
                <div className="text-white/30 font-mono text-[9px] tracking-widest uppercase">Diameter</div>
                <div className="text-white font-bold" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{diamM}</div>
                <div className="text-white/30 font-mono text-[9px]">Meters</div>
                <div className="text-white/20 font-mono text-[9px] mt-1">{kms} km/s</div>
              </div>
            </div>

            {/* Yield card */}
            <div className="liquid-glass-strong rounded-2xl p-6 shrink-0">
              <div className="text-white/30 font-mono text-[9px] tracking-widest uppercase mb-2">Kinetic Yield</div>
              <div className="font-bold" style={{ fontSize: '2.8rem', letterSpacing: '-0.02em', lineHeight: 1, color: 'rgba(255,180,60,0.9)' }}>
                {label}
              </div>
              <div className="text-white/30 font-mono text-[9px] mt-2">E = ½mv² · ρ = 3,000 kg/m³</div>
            </div>

            {/* Comparison table */}
            <div className="liquid-glass rounded-2xl p-5 flex-1 min-h-0">
              <div className="text-white/30 font-mono text-[9px] tracking-widest uppercase mb-4">Compared to</div>
              <div className="flex flex-col gap-3">
                {REFS.map(({ label: rl, mt: rmt }) => {
                  const ratio = mt / rmt;
                  return (
                    <div key={rl} className="flex items-center gap-3">
                      <div className="text-white/40 text-xs flex-1" style={{ fontFamily: "'Satoshi-Variable', sans-serif" }}>{rl}</div>
                      <div className="h-px flex-[2] rounded" style={{
                        background: ratio >= 1
                          ? `linear-gradient(to right, rgba(255,180,60,${Math.min(0.8, 0.2 + ratio * 0.05)}), rgba(255,100,40,0.3))`
                          : 'rgba(255,255,255,0.06)',
                        width: `${Math.min(100, ratio * 20)}%`,
                      }} />
                      <div className="text-white/60 font-mono text-[10px] w-16 text-right">
                        {ratio >= 1000 ? `${(ratio / 1000).toFixed(1)}k×` : ratio >= 1 ? `${ratio.toFixed(1)}×` : `${(1 / ratio).toFixed(0)}× less`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Glossary ── */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
            {[
              {
                term: 'LD',
                full: 'Lunar Distance',
                value: '384,400 km',
                body: `The Earth–Moon gap. This asteroid passes at ${ld} LD — ${parseFloat(ld) < 10 ? 'relatively close on a cosmic scale, but still safely beyond the Moon' : 'well beyond the Moon'}.`,
              },
              {
                term: 'AU',
                full: 'Astronomical Unit',
                value: '149,597,870 km',
                body: `The Earth–Sun distance. At ${au} AU, this object is ${parseFloat(au) < 0.05 ? 'within PHO monitoring range' : 'outside the PHO threshold of 0.05 AU'}.`,
              },
              {
                term: 'PHO',
                full: 'Potentially Hazardous Object',
                value: '>140m & <0.05 AU',
                body: a.isPotentiallyHazardous
                  ? 'This asteroid qualifies as a PHO. It is catalogued and continuously tracked by NASA CNEOS. PHO ≠ collision risk — it means persistent observation is warranted.'
                  : 'This object does not meet PHO criteria — either too small (<140m), too distant (>0.05 AU), or both. No escalated monitoring required.',
              },
              {
                term: 'NEO',
                full: 'Near-Earth Object',
                value: 'Perihelion <1.3 AU',
                body: 'Any comet or asteroid with a closest solar approach within 1.3 AU. NASA currently tracks 36,000+ NEOs. The empty danger quadrant in the graph above proves the largest are all safely distant.',
              },
            ].map(({ term, full, value, body }) => (
              <div key={term} className="liquid-glass rounded-2xl p-5 flex-1 min-h-0">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-white font-bold text-lg" style={{ letterSpacing: '-0.02em' }}>{term}</span>
                  <span className="text-white/40 text-xs">{full}</span>
                  <span className="ml-auto text-white/20 font-mono text-[9px]">{value}</span>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
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

  // Scroll lock when overlay is open
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
      />

      {/* ── Hover HUD ──────────────────────────────────────────── */}
      {hoverInfo && !selectedAsteroid && (
        <div
          className="fixed z-50 pointer-events-none liquid-glass-strong rounded-2xl p-5 w-72"
          style={{ left: hoverInfo.x + 20, top: hoverInfo.y + 20, fontFamily: "'Satoshi-Variable', sans-serif" }}
        >
          <div className="flex justify-between items-start border-b pb-2 mb-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="text-white font-semibold text-sm leading-tight" style={{ letterSpacing: '-0.01em' }}>{hoverInfo.data.name}</div>
            {hoverInfo.data.isPotentiallyHazardous && (
              <div className="liquid-glass text-white/60 text-[8px] px-2 py-0.5 rounded-full ml-2 shrink-0 uppercase tracking-widest">PHO</div>
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
              <span className="text-white/30 text-[9px]">{(hoverInfo.data.missDistanceKm / 149597870).toFixed(4)} AU</span>
            </div>
            <span className="text-white/30 text-[10px] uppercase tracking-widest">Velocity</span>
            <span className="text-right text-white/80 text-xs font-medium">{(hoverInfo.data.relativeVelocityKmh / 3600).toFixed(2)} km/s</span>
          </div>
          <div className="mt-3 pt-2 border-t text-[9px] text-white/20 uppercase tracking-widest" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            Click to analyse
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full px-8 py-5 flex justify-between items-center z-[100] pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, rgba(5,2,2,0.6) 0%, transparent 100%)' }}>
        <div className="font-bold tracking-widest text-sm uppercase text-white/80">The Threat Matrix</div>
        <div className="hidden md:block text-[10px] tracking-[0.3em] font-light uppercase text-white/25">NASA NEO API</div>
      </nav>

      {/* ── 300vh Scroll Container ─────────────────────────────── */}
      <div className="relative z-10 w-full flex flex-col" style={{ height: '300vh' }}>

        {/* Phase 0 */}
        <section className="h-screen flex flex-col justify-center items-start px-12 md:px-24 pointer-events-none">
          <div className="liquid-glass-strong rounded-3xl p-8 max-w-xl pointer-events-auto">
            <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ letterSpacing: '-0.03em' }}>
              Our Pale<br />Blue Dot.
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Hover over the globe. Scroll to reveal the threats.
            </p>
          </div>
        </section>

        {/* Phase 1 */}
        <section className="h-screen flex flex-col justify-center items-end px-12 md:px-24 pointer-events-none">
          <div className="liquid-glass-strong rounded-3xl p-8 max-w-xl text-right pointer-events-auto">
            <h2 className="text-5xl font-bold mb-4 text-white" style={{ letterSpacing: '-0.03em' }}>
              The Swarm<br />Approaches.
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              36,000+ near-Earth objects tracked. Media says constant danger. The data says otherwise.
            </p>
          </div>
        </section>

        {/* Phase 2: Graph + Timeline */}
        <section className="h-screen relative pointer-events-none">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/40 font-mono text-xs tracking-widest uppercase">Live NASA data · hover to inspect · click to analyse</p>
          </div>

          {/* Axis labels */}
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/20 font-mono text-[10px] tracking-widest uppercase">
            Miss Distance →
          </div>
          <div className="absolute left-6 top-1/2 text-white/20 font-mono text-[10px] tracking-widest uppercase"
               style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}>
            Diameter →
          </div>

          {/* ── Timeline ── */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4 pointer-events-auto">
            <div className="liquid-glass rounded-full px-4 py-3 flex flex-wrap justify-center gap-2 items-center max-w-3xl">
              <span className="text-white/25 text-[10px] font-mono uppercase tracking-widest hidden md:block px-2">
                {timelineLoading ? '…' : 'Era'}
              </span>

              {[
                { id: 'current',     label: 'This Week',          date: undefined       },
                { id: 'chelyabinsk', label: 'Chelyabinsk 2013',   date: '2013-02-11'   },
                { id: 'apophis',     label: 'Apophis 2029',       date: '2029-04-07'   },
              ].map((tl) => (
                <button
                  key={tl.id}
                  onClick={() => loadDate(tl.date, tl.id)}
                  disabled={timelineLoading}
                  className={`liquid-glass rounded-full px-4 py-1.5 text-[11px] font-medium tracking-wide transition-all ${
                    activeTimeline === tl.id ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                  style={activeTimeline === tl.id ? { boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 0 12px rgba(255,255,255,0.05)' } : {}}
                >
                  {tl.label}
                </button>
              ))}

              {/* Custom date — dark colour-scheme prevents white chrome popup */}
              <div className="liquid-glass rounded-full px-3 py-1.5 flex items-center gap-2 hover:text-white/70 transition-colors">
                <label htmlFor="custom-date" className="text-[10px] text-white/25 uppercase tracking-widest cursor-pointer">Date:</label>
                <input
                  type="date"
                  id="custom-date"
                  disabled={timelineLoading}
                  className="bg-transparent text-white/60 text-[11px] font-medium focus:outline-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                  onChange={(e) => { if (e.target.value) loadCustomDate(e.target.value); }}
                  onWheel={(e) => {
                    // Let wheel events pass through to the date field without fighting page scroll
                    e.stopPropagation();
                  }}
                />
              </div>
            </div>

            {nasaData.length > 0 && (
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-white/15 font-mono text-[9px]">
                {nasaData.length} objects · {nasaData.filter(a => a.isPotentiallyHazardous).length} PHO
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Narrative Section ──────────────────────────────────── */}
      <section className="relative z-20 w-full min-h-screen pt-28 pb-20" style={{ background: '#0a0505' }}>
        <div className="max-w-3xl mx-auto px-8 md:px-16 mb-20 text-center">
          <p className="text-white/25 font-mono text-[10px] tracking-[0.5em] uppercase mb-6">The Science</p>
          <h2 className="text-white font-bold mb-6" style={{ fontSize: '2.5rem', letterSpacing: '-0.03em' }}>
            The Reality of Planetary Defense
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto leading-relaxed">
            The graph looks empty because space is staggeringly vast.
          </p>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 px-8 md:px-16 pb-8" style={{ scrollbarWidth: 'none' }}>
          {[
            { date: 'Feb 15, 2013', title: 'Chelyabinsk', body: 'A 20-meter asteroid entered atmosphere above Russia undetected. 30× the energy of Hiroshima. 1,500 injuries from shockwave glass. The sun\'s blind spot claimed another victim.', meta: '~20m · 0 km miss · Undetected' },
            { date: 'The Graph', title: 'Empty Danger Zone', body: 'The top-left — large and close — is completely empty. Not a rendering error. Every extinction-class asteroid is catalogued, tracked, and confirmed safe for the next 100 years.', meta: 'Source: NASA CNEOS' },
            { date: 'Sep 26, 2022', title: 'DART Mission', body: 'NASA deliberately smashed a spacecraft into Dimorphos (160m moonlet) and changed its orbital period by 33 minutes. Kinetic impactor technology confirmed. We can deflect threats.', meta: '33 min orbital change · Hubble + Webb confirmed' },
          ].map((c) => (
            <article key={c.title} className="min-w-[78vw] md:min-w-[38vw] snap-center shrink-0 liquid-glass-strong rounded-3xl p-8 flex flex-col gap-4">
              <p className="text-white/25 font-mono text-[10px] tracking-[0.3em] uppercase">{c.date}</p>
              <h3 className="text-white font-bold text-xl" style={{ letterSpacing: '-0.02em' }}>{c.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{c.body}</p>
              <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-white/20 font-mono text-[9px] tracking-widest uppercase">{c.meta}</p>
              </div>
            </article>
          ))}
          <div className="min-w-[4vw] shrink-0" />
        </div>

        <div className="flex items-center justify-center gap-3 mt-8" style={{ opacity: 0.2 }}>
          <div className="w-6 h-px bg-white rounded" />
          <span className="text-white font-mono text-[9px] tracking-[0.3em] uppercase">Swipe</span>
          <div className="w-6 h-px bg-white rounded" />
        </div>

        <div className="max-w-xl mx-auto px-8 mt-24 text-center">
          <p className="text-white/30 text-sm leading-relaxed">
            Live data from{' '}
            <a href="https://api.nasa.gov/" target="_blank" rel="noopener noreferrer" className="text-white/50 underline underline-offset-4 hover:text-white/70 transition-colors">
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
