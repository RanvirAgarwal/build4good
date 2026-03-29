import React, { useState, useEffect, useCallback } from 'react';
import { ParticleScene, HoverInfo } from '../components/ParticleScene';
import { fetchNasaData, NeoAsteroid } from '../utils/nasaApi';

// ── Kinetic Energy Physics ─────────────────────────────────────────────────
function calcYield(asteroid: NeoAsteroid): string {
  const radiusM    = (asteroid.estimatedDiameterKm * 1000) / 2;
  const volume     = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
  const mass       = volume * 3000;                       // 3000 kg/m³ rock density
  const velocityMs = asteroid.relativeVelocityKmh / 3.6; // km/h → m/s
  const joules     = 0.5 * mass * Math.pow(velocityMs, 2);
  const megatons   = joules / 4.184e15;
  return megatons >= 1000
    ? `${(megatons / 1000).toFixed(2)} Gigatons`
    : megatons >= 0.01
    ? `${megatons.toFixed(2)} Megatons`
    : `${(megatons * 1000).toFixed(3)} Kilotons`;
}

// ── Home ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [hoverInfo,        setHoverInfo]        = useState<HoverInfo | null>(null);
  const [selectedAsteroid, setSelectedAsteroid] = useState<NeoAsteroid | null>(null);
  const [nasaData,         setNasaData]         = useState<NeoAsteroid[]>([]);
  const [activeTimeline,   setActiveTimeline]   = useState('current');
  const [timelineLoading,  setTimelineLoading]  = useState(false);

  // Initial data load
  useEffect(() => { fetchNasaData().then(setNasaData); }, []);

  // Body scroll lock when overlay is open
  useEffect(() => {
    if (selectedAsteroid) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedAsteroid]);

  // Close overlay on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedAsteroid(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const loadDate = useCallback(async (startDate: string | undefined, id: string) => {
    if (id === activeTimeline) return;
    setActiveTimeline(id);
    setTimelineLoading(true);
    try {
      const data = await fetchNasaData(startDate);
      setNasaData(data);
    } finally {
      setTimelineLoading(false);
    }
  }, [activeTimeline]);

  const loadCustomDate = useCallback(async (isoDate: string) => {
    setActiveTimeline('custom');
    setTimelineLoading(true);
    try {
      const data = await fetchNasaData(isoDate);
      setNasaData(data);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  return (
    <main className="relative w-full text-white font-sans selection:bg-cyan-500/30">
      <ParticleScene
        onHover={setHoverInfo}
        onClickAsteroid={setSelectedAsteroid}
        nasaData={nasaData}
      />

      {/* ── Hover HUD ──────────────────────────────────────────── */}
      {hoverInfo && !selectedAsteroid && (
        <div
          className="fixed z-50 pointer-events-none backdrop-blur-xl bg-black/90 border border-orange-500/30 p-5 rounded-xl shadow-[0_0_20px_rgba(255,100,0,0.15)] font-mono tracking-widest text-sm w-80"
          style={{ left: hoverInfo.x + 20, top: hoverInfo.y + 20 }}
        >
          <div className="flex justify-between items-start border-b border-white/10 pb-2 mb-3">
            <div className="text-white font-bold text-base leading-tight">{hoverInfo.data.name}</div>
            {hoverInfo.data.isPotentiallyHazardous && (
              <div className="text-red-400 text-[9px] border border-red-500/40 px-2 py-1 rounded bg-red-500/10 animate-pulse ml-2 shrink-0">PHO</div>
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
              <span className="text-cyan-400 font-bold">{(hoverInfo.data.missDistanceKm / 384400).toFixed(2)} LD</span>
              <span className="text-white/30 text-[10px]">{(hoverInfo.data.missDistanceKm / 149597870).toFixed(4)} AU</span>
            </div>
            <span className="text-white/40 text-[10px] uppercase">Velocity</span>
            <span className="text-right text-white/70">{(hoverInfo.data.relativeVelocityKmh / 3600).toFixed(2)} km/s</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-white/20 uppercase tracking-widest">
            Click to analyse impact
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full p-6 lg:p-10 flex justify-between items-center z-[100] bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="font-bold tracking-[0.2em] text-sm lg:text-lg">THE THREAT MATRIX</div>
        <div className="hidden md:flex text-[10px] tracking-[0.3em] font-light uppercase opacity-50">NASA NEO API DATA</div>
      </nav>

      {/* ── 300vh Scroll Container ─────────────────────────────── */}
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
            <p className="text-white/50 font-mono text-sm tracking-widest uppercase">1 week of real NASA data</p>
            <p className="text-white/30 font-mono text-xs mt-1">Each dot is a real tracked asteroid. Hover to inspect, click to analyse.</p>
          </div>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/25 font-mono text-xs tracking-widest uppercase">Miss Distance →</div>
          <div className="absolute left-6 top-1/2 text-white/25 font-mono text-xs tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}>
            Estimated Diameter →
          </div>

          {/* Timeline UI */}
          <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center px-4 pointer-events-auto">
            <div className="backdrop-blur-md bg-black/60 border border-white/10 p-3 rounded-full flex flex-wrap justify-center gap-3 items-center max-w-4xl shadow-2xl">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-4 hidden md:inline">
                {timelineLoading ? '⟳ Loading…' : 'Timeframe:'}
              </span>

              {[
                { id: 'current',     label: 'Current Week',      date: undefined       },
                { id: 'chelyabinsk', label: 'Chelyabinsk (2013)', date: '2013-02-11'   },
                { id: 'apophis',     label: 'Apophis (2029)',     date: '2029-04-07'   },
              ].map((tl) => (
                <button
                  key={tl.id}
                  onClick={() => loadDate(tl.date, tl.id)}
                  disabled={timelineLoading}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-colors ${
                    activeTimeline === tl.id
                      ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40'
                      : 'bg-white/10 hover:bg-orange-500/20 text-white'
                  }`}
                >
                  {tl.label}
                </button>
              ))}

              {/* Custom date picker */}
              <div className="flex items-center bg-white/5 rounded-full px-3 py-1.5 border border-white/10 hover:border-orange-500/50 transition-colors">
                <label htmlFor="custom-date" className="text-[10px] text-gray-400 uppercase tracking-wider mr-2">Custom:</label>
                <input
                  type="date"
                  id="custom-date"
                  disabled={timelineLoading}
                  className="bg-transparent text-orange-300 text-xs font-bold focus:outline-none cursor-pointer"
                  onChange={(e) => { if (e.target.value) loadCustomDate(e.target.value); }}
                />
              </div>
            </div>
            {nasaData.length > 0 && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white/20 font-mono text-[9px]">
                {nasaData.length} objects · {nasaData.filter(a => a.isPotentiallyHazardous).length} PHO
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Narrative Section ──────────────────────────────────── */}
      <section className="relative z-20 w-full min-h-screen bg-[#0a0505] pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-8 md:px-16 mb-20 text-center">
          <p className="text-white/30 font-mono text-[10px] tracking-[0.5em] uppercase mb-6">The Science</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 text-white">The Reality of Planetary Defense</h2>
          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            The graph above looks empty because space is staggeringly vast. Media hype relies on ignoring this scale.
          </p>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-8 px-8 md:px-16 pb-8 w-full" style={{ scrollbarWidth: 'none' }}>
          {[
            { date: 'Feb 15, 2013', title: 'The Chelyabinsk Event', body: 'A 20-meter asteroid entered the atmosphere above Russia completely undetected. It released 30× the energy of the Hiroshima bomb, injuring 1,500 people from shockwave-shattered glass. It came from the sun\'s blind spot — too small to track.', meta: 'Diameter: ~20m · Miss distance: 0 km · Detected: No' },
            { date: 'Reading the Graph', title: 'The Empty Danger Quadrant', body: 'The top-left of the scatter plot — large and close — is completely empty. Every asteroid large enough to cause extinction-level damage has been identified and is tracked. They are all millions of miles away. None are on a collision course.', meta: 'Source: NASA CNEOS' },
            { date: 'Sep 26, 2022', title: "NASA's DART Mission", body: 'The Double Asteroid Redirection Test deliberately collided a spacecraft with Dimorphos, a 160-meter moonlet, and changed its orbital period by 33 minutes — proving kinetic impactor technology works. We are no longer passive observers.', meta: 'Orbital change: 33 min · Confirmed by Hubble + Webb' },
          ].map((card) => (
            <article key={card.title} className="min-w-[80vw] md:min-w-[40vw] snap-center shrink-0 rounded-2xl p-8 flex flex-col gap-4 backdrop-blur-md bg-white/5 border border-red-500/20 hover:bg-white/10 transition-colors">
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
            <a href="https://api.nasa.gov/" target="_blank" rel="noopener noreferrer" className="text-white/50 underline underline-offset-4 hover:text-white/70 transition-colors">
              NASA NeoWs API
            </a>
            . All asteroid positions are real close-approach data.
          </p>
        </div>
      </section>

      {/* ── Kinetic Impact Overlay ─────────────────────────────── */}
      {selectedAsteroid && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-xl flex justify-center items-center p-4 md:p-12 overflow-y-auto">
          <div className="bg-[#0a0505]/95 border border-red-500/30 rounded-3xl w-full max-w-5xl shadow-[0_0_50px_rgba(255,50,0,0.1)] overflow-hidden relative">

            {/* Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-start gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">{selectedAsteroid.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm font-mono tracking-widest">
                    {(selectedAsteroid.relativeVelocityKmh / 3600).toFixed(2)} km/s
                  </span>
                  <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm font-mono tracking-widest">
                    {selectedAsteroid.estimatedDiameterKm >= 1
                      ? `${selectedAsteroid.estimatedDiameterKm.toFixed(2)} km`
                      : `${(selectedAsteroid.estimatedDiameterKm * 1000).toFixed(0)} m`}
                  </span>
                  {selectedAsteroid.isPotentiallyHazardous && (
                    <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded-full text-sm font-bold tracking-widest animate-pulse">
                      POTENTIALLY HAZARDOUS
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedAsteroid(null)}
                className="text-white/50 hover:text-white bg-white/5 hover:bg-white/15 rounded-full px-4 py-2 transition-colors font-mono text-xs tracking-widest uppercase shrink-0"
              >
                ← Back
              </button>
            </div>

            {/* 2-Column Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">

              {/* Left: Threat Assessment */}
              <div className="p-8 md:p-12">
                <h3 className="text-xl font-bold text-orange-400 mb-8 tracking-tight">Threat Assessment</h3>

                <div className="mb-8">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-mono">Proximity</div>
                  <div className="text-4xl text-cyan-400 font-bold mb-3">
                    {(selectedAsteroid.missDistanceKm / 384400).toFixed(2)} LD
                  </div>
                  <p className="text-white/50 leading-relaxed text-sm">
                    <span className="text-white/70 font-semibold">LD (Lunar Distance)</span> is the Earth–Moon gap: 384,400 km.
                    This asteroid is passing at {(selectedAsteroid.missDistanceKm / 384400).toFixed(1)}× that distance.
                    That's {(selectedAsteroid.missDistanceKm / 149597870).toFixed(4)} AU — the scale used to navigate the solar system.
                  </p>
                </div>

                <div className="mb-8">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-mono">Scale</div>
                  <div className="text-4xl text-white font-bold mb-3">
                    {(selectedAsteroid.estimatedDiameterKm * 1000).toFixed(0)} meters
                  </div>
                  <p className="text-white/50 leading-relaxed text-sm">
                    Chelyabinsk (2013) was ~20 m. Tunguska (1908) was ~50 m. The Chicxulub impactor (dinosaurs) was ~10,000 m.
                    Objects under 140 m rarely survive atmospheric entry intact.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1 font-mono">
                    {selectedAsteroid.isPotentiallyHazardous ? 'PHO Status' : 'Not a PHO'}
                  </div>
                  <p className="text-white/40 text-sm leading-relaxed">
                    {selectedAsteroid.isPotentiallyHazardous
                      ? 'PHO (Potentially Hazardous Object): >140m in size and comes within 0.05 AU of Earth\'s orbit. PHO status means continuous monitoring — not an imminent threat.'
                      : 'This object does not meet PHO criteria. Either too small (<140m), too distant (>0.05 AU), or both. No monitoring escalation warranted.'}
                  </p>
                </div>
              </div>

              {/* Right: Kinetic Math */}
              <div className="p-8 md:p-12">
                <h3 className="text-xl font-bold text-red-400 mb-8 tracking-tight">Impact Analysis</h3>

                {/* Big yield number */}
                <div className="p-6 bg-red-950/30 border border-red-500/20 rounded-2xl mb-8">
                  <div className="text-[10px] text-red-400/60 uppercase tracking-widest mb-1 font-mono">Estimated Kinetic Yield</div>
                  <div className="text-4xl text-red-400 font-bold mb-2">{calcYield(selectedAsteroid)}</div>
                  <p className="text-red-200/40 text-xs leading-relaxed font-mono">
                    E = ½mv² · density 3,000 kg/m³ · current velocity
                  </p>
                </div>

                {/* Comparison table */}
                <div className="space-y-3 mb-8">
                  {[
                    { ref: 'Hiroshima bomb',   mt: 0.000015, color: 'text-yellow-400' },
                    { ref: 'Chelyabinsk 2013', mt: 0.5,      color: 'text-orange-400' },
                    { ref: 'Castle Bravo test',mt: 15,       color: 'text-red-400'    },
                    { ref: 'Tsar Bomba test',  mt: 50,       color: 'text-red-500'    },
                  ].map(({ ref, mt, color }) => {
                    const radiusM    = (selectedAsteroid.estimatedDiameterKm * 1000) / 2;
                    const volume     = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
                    const mass       = volume * 3000;
                    const velocityMs = selectedAsteroid.relativeVelocityKmh / 3.6;
                    const asteroidMt = (0.5 * mass * Math.pow(velocityMs, 2)) / 4.184e15;
                    const ratio      = asteroidMt / mt;
                    return (
                      <div key={ref} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                        <span className="text-white/40 text-xs flex-1">{ref}</span>
                        <span className={`font-mono text-xs ${color}`}>
                          {ratio >= 1000
                            ? `${(ratio / 1000).toFixed(1)}k×`
                            : ratio >= 1
                            ? `${ratio.toFixed(1)}×`
                            : `${(1 / ratio).toFixed(1)}× less`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <p className="text-white/40 text-sm leading-relaxed">
                    <span className="text-white/60 font-semibold">Remember the graph: </span>
                    Every asteroid with a truly catastrophic yield sits safely in the right side of the scatter plot — millions of miles away. The danger quadrant remains empty.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
