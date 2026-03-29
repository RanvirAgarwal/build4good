import React, { useState, useEffect, useCallback } from 'react';
import { ParticleScene, HoverInfo } from '../components/ParticleScene';
import { fetchNasaData, NeoAsteroid } from '../utils/nasaApi';

// ──────────────────────────────────────────────
// Timeline presets
// ──────────────────────────────────────────────
const TIMELINES = [
  { id: 'current',     label: 'Current Week', startDate: undefined },
  { id: 'chelyabinsk', label: 'Chelyabinsk (Feb 2013)', startDate: '2013-02-11' },
  { id: 'apophis',     label: 'Apophis (Apr 2029)', startDate: '2029-04-07' },
];

// ──────────────────────────────────────────────
// Kinetic Energy Physics Engine
// ──────────────────────────────────────────────
function calcKineticEnergy(asteroid: NeoAsteroid) {
  const radiusM   = (asteroid.estimatedDiameterKm * 1000) / 2;
  const volume    = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
  const mass      = volume * 3000; // rock density kg/m³
  const velocityMs = asteroid.relativeVelocityKmh / 3.6;
  const joules    = 0.5 * mass * Math.pow(velocityMs, 2);
  const megatons  = joules / 4.184e15;
  return { megatons, mass, velocityMs, radiusM };
}

// Known blast reference points
const BLAST_REFS = [
  { label: 'Chelyabinsk',  mt: 0.5,   color: 'rgba(255,200,100,0.6)' },
  { label: 'Castle Bravo', mt: 15,    color: 'rgba(255,140,60,0.5)'  },
  { label: 'Tsar Bomba',   mt: 50,    color: 'rgba(255,80,40,0.4)'   },
  { label: 'Impact Risk',  mt: 1000,  color: 'rgba(255,30,0,0.3)'    },
];

// ──────────────────────────────────────────────
// Kinetic Impact Overlay
// ──────────────────────────────────────────────
function KineticImpactOverlay({ asteroid, onClose }: { asteroid: NeoAsteroid; onClose: () => void }) {
  const { megatons, mass, velocityMs, radiusM } = calcKineticEnergy(asteroid);

  const maxRef = BLAST_REFS[BLAST_REFS.length - 1].mt;
  const megatonsDisplay = megatons >= 1000
    ? `${(megatons / 1000).toFixed(1)}k`
    : megatons >= 1
    ? megatons.toFixed(1)
    : megatons.toFixed(4);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 border-b border-white/10 px-8 py-5 flex items-center gap-6">
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors font-mono text-xs tracking-widest uppercase flex items-center gap-2"
        >
          ← Back to Matrix
        </button>
        <div className="flex-1" />
        <div className="text-white/20 font-mono text-[10px] tracking-[0.4em] uppercase">
          Impact Analysis
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">

        {/* LEFT: Physics + Blast Circle */}
        <div className="border-r border-white/5 p-8 md:p-14 flex flex-col justify-center">
          <p className="text-white/30 font-mono text-[10px] tracking-[0.4em] uppercase mb-4">
            Kinetic Yield
          </p>
          <h2 className="text-white font-bold tracking-tighter mb-2" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
            {asteroid.name}
          </h2>
          <p className="text-white/40 font-mono text-sm mb-10">
            Estimated impact yield at current trajectory
          </p>

          {/* Big number */}
          <div className="mb-12">
            <div className="text-orange-400 font-bold leading-none" style={{ fontSize: 'clamp(3rem, 12vw, 8rem)' }}>
              {megatonsDisplay}
            </div>
            <div className="text-white/40 font-mono text-sm tracking-widest uppercase mt-2">
              Megatons of TNT
            </div>
          </div>

          {/* Concentric Blast Circles */}
          <div className="relative w-64 h-64 mx-auto mb-8">
            {BLAST_REFS.map((ref) => {
              const pct = Math.min(1, Math.log10(ref.mt + 1) / Math.log10(maxRef + 1));
              const sizePct = pct * 100;
              return (
                <div
                  key={ref.label}
                  className="absolute rounded-full border flex items-center justify-center"
                  style={{
                    width:  `${sizePct}%`,
                    height: `${sizePct}%`,
                    top:    `${(100 - sizePct) / 2}%`,
                    left:   `${(100 - sizePct) / 2}%`,
                    borderColor: ref.color,
                    background: ref.color.replace('0.3', '0.04'),
                  }}
                >
                  <span
                    className="absolute font-mono text-[9px] text-white/40 tracking-wider"
                    style={{ top: '-1.2em', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
                  >
                    {ref.label} ({ref.mt >= 1000 ? `${ref.mt / 1000}k` : ref.mt} MT)
                  </span>
                </div>
              );
            })}
            {/* Asteroid indicator */}
            {megatons > 0 && (() => {
              const pct = Math.min(1, Math.log10(megatons + 1) / Math.log10(maxRef + 1));
              const sizePct = pct * 100;
              return (
                <div
                  className="absolute rounded-full border-2 border-orange-400 animate-pulse"
                  style={{
                    width:  `${sizePct}%`,
                    height: `${sizePct}%`,
                    top:    `${(100 - sizePct) / 2}%`,
                    left:   `${(100 - sizePct) / 2}%`,
                    background: 'rgba(255,140,0,0.08)',
                    boxShadow: '0 0 20px rgba(255,140,0,0.3)',
                  }}
                />
              );
            })()}
          </div>

          {/* Data table */}
          <div className="grid grid-cols-2 gap-y-3 font-mono text-sm max-w-xs">
            <span className="text-white/30 text-xs uppercase">Diameter</span>
            <span className="text-right text-white/70">
              {asteroid.estimatedDiameterKm >= 1
                ? `${asteroid.estimatedDiameterKm.toFixed(2)} km`
                : `${(asteroid.estimatedDiameterKm * 1000).toFixed(0)} m`}
            </span>
            <span className="text-white/30 text-xs uppercase">Mass (est.)</span>
            <span className="text-right text-white/70">
              {mass >= 1e12
                ? `${(mass / 1e12).toFixed(2)}T kg`
                : mass >= 1e9
                ? `${(mass / 1e9).toFixed(2)}B kg`
                : `${(mass / 1e6).toFixed(2)}M kg`}
            </span>
            <span className="text-white/30 text-xs uppercase">Velocity</span>
            <span className="text-right text-white/70">{(velocityMs / 1000).toFixed(2)} km/s</span>
            <span className="text-white/30 text-xs uppercase">Miss Distance</span>
            <span className="text-right text-cyan-400">
              {(asteroid.missDistanceKm / 384400).toFixed(2)} LD
            </span>
          </div>
        </div>

        {/* RIGHT: Glossary */}
        <div className="p-8 md:p-14 flex flex-col justify-center">
          <p className="text-white/30 font-mono text-[10px] tracking-[0.4em] uppercase mb-10">
            Glossary of Terms
          </p>

          {[
            {
              term: 'LD',
              full: 'Lunar Distance',
              value: '384,400 km',
              desc: 'The average distance from Earth to the Moon. Used as a human-scale ruler for "near" objects in our orbital neighbourhood. 1 LD sounds close. At 100+ LD per hour, light travels from Earth to Moon in 1.3 seconds.',
              accent: 'text-cyan-400',
            },
            {
              term: 'AU',
              full: 'Astronomical Unit',
              value: '149,597,870 km',
              desc: 'The mean distance from Earth to the Sun. The yardstick of the solar system. Mars is 1.5 AU away. Jupiter is 5.2 AU. Pluto, 39.5 AU. Most tracked NEOs approach within 0.05 AU ≈ 7.5 million km.',
              accent: 'text-orange-400',
            },
            {
              term: 'PHO',
              full: 'Potentially Hazardous Object',
              value: '>140m & <0.05 AU',
              desc: 'An asteroid larger than 140 meters that ever comes within 0.05 Astronomical Units of Earth\'s orbit. PHO status does NOT mean an impact is predicted — it means the orbit warrants long-term monitoring. As of 2025, zero known PHOs are on collision course.',
              accent: 'text-red-400',
            },
            {
              term: 'NEO',
              full: 'Near-Earth Object',
              value: 'Perihelion < 1.3 AU',
              desc: 'Any comet or asteroid with a perihelion distance (closest point to the Sun) less than 1.3 AU. NASA\'s Center for Near Earth Object Studies (CNEOS) currently tracks over 36,000 NEOs. Size ranges from grain-of-sand to 1036 Ganymed at 38 km across.',
              accent: 'text-white/70',
            },
          ].map((item) => (
            <div key={item.term} className="mb-8 border-l-2 border-white/5 pl-6">
              <div className="flex items-baseline gap-3 mb-1">
                <span className={`font-bold text-2xl font-mono ${item.accent}`}>{item.term}</span>
                <span className="text-white/50 text-sm">{item.full}</span>
                <span className="ml-auto text-white/20 font-mono text-xs">{item.value}</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}

          {/* Disclaimer */}
          <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <p className="text-white/20 font-mono text-[10px] leading-relaxed">
              Physics model assumes spherical chondrite asteroid (ρ = 3,000 kg/m³), vertical impact,
              and current approach velocity. Real impact energy depends on composition, angle,
              and atmospheric entry dynamics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Home Page
// ──────────────────────────────────────────────
export default function Home() {
  const [hoverInfo,        setHoverInfo]        = useState<HoverInfo | null>(null);
  const [selectedAsteroid, setSelectedAsteroid] = useState<NeoAsteroid | null>(null);
  const [nasaData,         setNasaData]         = useState<NeoAsteroid[]>([]);
  const [activeTimeline,   setActiveTimeline]   = useState('current');
  const [timelineLoading,  setTimelineLoading]  = useState(false);

  // Load current-week data on mount (ParticleScene also does this internally as fallback)
  useEffect(() => {
    fetchNasaData().then(setNasaData);
  }, []);

  const handleTimelineChange = useCallback(async (tl: typeof TIMELINES[0]) => {
    if (tl.id === activeTimeline) return;
    setActiveTimeline(tl.id);
    setTimelineLoading(true);
    try {
      const data = await fetchNasaData(tl.startDate);
      setNasaData(data);
    } finally {
      setTimelineLoading(false);
    }
  }, [activeTimeline]);

  // Close overlay on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAsteroid(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <main className="relative w-full text-white font-sans selection:bg-cyan-500/30">
      <ParticleScene
        onHover={setHoverInfo}
        onClickAsteroid={setSelectedAsteroid}
        nasaData={nasaData}
      />

      {/* ── Hover HUD Tooltip ─────────────────────────────────── */}
      {hoverInfo && !selectedAsteroid && (
        <div
          className="fixed z-50 pointer-events-none backdrop-blur-xl bg-black/90 border border-orange-500/30 p-5 rounded-xl shadow-[0_0_20px_rgba(255,100,0,0.15)] font-mono tracking-widest text-sm w-80"
          style={{ left: hoverInfo.x + 20, top: hoverInfo.y + 20 }}
        >
          <div className="flex justify-between items-start border-b border-white/10 pb-2 mb-3">
            <div className="text-white font-bold text-base leading-tight">{hoverInfo.data.name}</div>
            {hoverInfo.data.isPotentiallyHazardous && (
              <div className="text-red-400 text-[9px] border border-red-500/40 px-2 py-1 rounded bg-red-500/10 animate-pulse ml-2 shrink-0">
                PHO
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-3">
            <span className="text-white/40 text-[10px] uppercase">Diameter</span>
            <span className="text-right text-orange-300 font-bold">
              {hoverInfo.data.estimatedDiameterKm >= 1
                ? `${hoverInfo.data.estimatedDiameterKm.toFixed(2)} km`
                : `${(hoverInfo.data.estimatedDiameterKm * 1000).toFixed(0)} m`}
            </span>
            <span className="text-white/40 text-[10px] uppercase">Miss Distance</span>
            <div className="text-right flex flex-col gap-0.5">
              <span className="text-cyan-400 font-bold">
                {(hoverInfo.data.missDistanceKm / 384400).toFixed(2)} LD
              </span>
              <span className="text-white/30 text-[10px]">
                {(hoverInfo.data.missDistanceKm / 149597870).toFixed(4)} AU
              </span>
            </div>
            <span className="text-white/40 text-[10px] uppercase">Velocity</span>
            <span className="text-right text-white/70">
              {(hoverInfo.data.relativeVelocityKmh / 3600).toFixed(2)} km/s
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-white/20 uppercase tracking-widest">
            Click to analyse impact
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="fixed top-0 w-full p-6 lg:p-10 flex justify-between items-center z-[100] bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="font-bold tracking-[0.2em] text-sm lg:text-lg">THE THREAT MATRIX</div>
        <div className="hidden md:flex space-x-12 text-[10px] tracking-[0.3em] font-light uppercase opacity-50">
          NASA NEO API DATA
        </div>
      </nav>

      {/* ── 300vh Scroll Container ──────────────────────────── */}
      <div className="relative z-10 w-full flex flex-col" style={{ height: '300vh' }}>

        {/* Phase 0: Earth */}
        <section className="h-screen flex flex-col justify-center items-start px-12 md:px-24 pointer-events-none">
          <div className="backdrop-blur-md bg-black/40 border border-white/10 p-8 rounded-2xl max-w-xl pointer-events-auto">
            <h1 className="text-6xl font-bold mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
              Our Pale Blue Dot.
            </h1>
            <p className="text-xl text-gray-300">
              Hover over the globe. Humanity exists in a fragile orbital neighbourhood. Scroll to see what's out there.
            </p>
          </div>
        </section>

        {/* Phase 1: Swarm */}
        <section className="h-screen flex flex-col justify-center items-end px-12 md:px-24 pointer-events-none">
          <div className="backdrop-blur-md bg-black/40 border border-red-500/20 p-8 rounded-2xl max-w-xl text-right pointer-events-auto">
            <h2 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
              The Swarm Approaches
            </h2>
            <p className="text-xl text-gray-300">
              Over 36,000 near-Earth objects are tracked right now. The media narrative suggests constant, civilization-ending danger.
            </p>
          </div>
        </section>

        {/* Phase 2: Graph + Timeline */}
        <section className="h-screen relative pointer-events-none">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/50 font-mono text-sm tracking-widest uppercase">
              1 week of real NASA data
            </p>
            <p className="text-white/30 font-mono text-xs mt-1">
              Each dot is a real tracked asteroid. Hover to inspect, click to analyse.
            </p>
          </div>

          {/* Axis hint labels — HTML overlay, stays in DOM space */}
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/25 font-mono text-xs tracking-widest uppercase">
            Miss Distance →
          </div>
          <div
            className="absolute left-6 top-1/2 text-white/25 font-mono text-xs tracking-widest uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            Estimated Diameter →
          </div>

          {/* ── Timeline UI ───────────────────────────────── */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-3">
            <p className="text-white/20 font-mono text-[9px] tracking-[0.5em] uppercase">
              View time period
            </p>
            <div className="flex gap-2 backdrop-blur-md bg-black/50 border border-white/10 rounded-xl p-1.5">
              {TIMELINES.map((tl) => (
                <button
                  key={tl.id}
                  onClick={() => handleTimelineChange(tl)}
                  disabled={timelineLoading}
                  className={`relative px-4 py-2 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-all duration-300 ${
                    activeTimeline === tl.id
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  {timelineLoading && activeTimeline === tl.id ? (
                    <span className="animate-pulse">Loading…</span>
                  ) : tl.label}
                </button>
              ))}
            </div>
            {nasaData.length > 0 && (
              <p className="text-white/20 font-mono text-[9px]">
                {nasaData.length} objects · {nasaData.filter(a => a.isPotentiallyHazardous).length} PHO
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Narrative Section ───────────────────────────────── */}
      <section className="relative z-20 w-full min-h-screen bg-[#0a0505] pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-8 md:px-16 mb-20 text-center">
          <p className="text-white/30 font-mono text-[10px] tracking-[0.5em] uppercase mb-6">The Science</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 text-white">
            The Reality of Planetary Defense
          </h2>
          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            The graph above looks empty because space is staggeringly vast. Media hype relies on ignoring this scale.
          </p>
        </div>

        <div
          className="flex overflow-x-auto snap-x snap-mandatory gap-8 px-8 md:px-16 pb-8 w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[
            {
              date: 'Feb 15, 2013',
              title: 'The Chelyabinsk Event',
              body: 'A 20-meter asteroid entered the atmosphere above Russia completely undetected. It released 30 times the energy of the Hiroshima bomb, injuring 1,500 people from shockwave-shattered glass. It came from the sun\'s blind spot — too small to track.',
              meta: 'Diameter: ~20m · Miss distance: 0 km · Detected: No',
            },
            {
              date: 'Reading the Graph',
              title: 'The Empty Danger Quadrant',
              body: 'The top-left of the scatter plot — large and close — is completely empty. Every asteroid large enough to cause extinction-level damage has been identified and tracked. They are all millions of miles away. None are on a collision course.',
              meta: 'Source: NASA CNEOS',
            },
            {
              date: 'Sep 26, 2022',
              title: "NASA's DART Mission",
              body: 'The Double Asteroid Redirection Test deliberately collided a spacecraft with Dimorphos, a 160-meter moonlet, and changed its orbital period by 33 minutes — proving kinetic impactor technology works. We are no longer passive observers.',
              meta: 'Orbital change: 33 min · Confirmed by Hubble + Webb',
            },
          ].map((card) => (
            <article
              key={card.title}
              className="min-w-[80vw] md:min-w-[40vw] snap-center shrink-0 rounded-2xl p-8 flex flex-col gap-4 backdrop-blur-md bg-white/5 border border-red-500/20 hover:bg-white/10 transition-colors"
            >
              <p className="text-white/30 font-mono text-[10px] tracking-[0.3em] uppercase">{card.date}</p>
              <h3 className="text-2xl font-bold text-orange-400 mb-4">{card.title}</h3>
              <p className="text-gray-300 leading-relaxed">{card.body}</p>
              <div className="mt-auto pt-4 border-t border-white/10">
                <p className="text-white/20 font-mono text-[10px] tracking-widest uppercase">{card.meta}</p>
              </div>
            </article>
          ))}
          <div className="min-w-[4vw] shrink-0" />
        </div>

        <div className="flex items-center justify-center gap-3 mt-8 opacity-25">
          <div className="w-6 h-px bg-white rounded" />
          <span className="text-white font-mono text-[10px] tracking-[0.3em] uppercase">Swipe</span>
          <div className="w-6 h-px bg-white rounded" />
        </div>

        <div className="max-w-xl mx-auto px-8 mt-24 text-center">
          <p className="text-white/15 font-mono text-[10px] tracking-[0.3em] uppercase mb-2">Data source</p>
          <p className="text-white/30 text-sm leading-relaxed">
            Powered by live data from the{' '}
            <a
              href="https://api.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 underline underline-offset-4 hover:text-white/70 transition-colors"
            >
              NASA NeoWs API
            </a>
            . All asteroid positions are real close-approach data.
          </p>
        </div>
      </section>

      {/* ── Kinetic Impact Overlay ──────────────────────────── */}
      {selectedAsteroid && (
        <KineticImpactOverlay
          asteroid={selectedAsteroid}
          onClose={() => setSelectedAsteroid(null)}
        />
      )}
    </main>
  );
}
