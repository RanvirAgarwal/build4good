import React from 'react';
import { ParticleScene } from '../components/ParticleScene';

export default function Home() {
  return (
    <main className="relative w-full text-white font-sans selection:bg-cyan-500/30">
      <ParticleScene />

      {/* Navigation */}
      <nav className="fixed top-0 w-full p-6 lg:p-10 flex justify-between items-center z-[100] bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="font-bold tracking-[0.2em] text-sm lg:text-lg">THE THREAT MATRIX</div>
        <div className="hidden md:flex space-x-12 text-[10px] tracking-[0.3em] font-light uppercase opacity-50">
           NASA NEO API DATA
        </div>
      </nav>

      {/* 300vh scrolling container — drives the 3D particle morph */}
      <div className="relative z-10 w-full flex flex-col" style={{ height: '300vh' }}>
        
        {/* Phase 0: The Earth (0vh to 100vh) */}
        <section className="h-screen flex flex-col justify-center items-start px-12 md:px-24 pointer-events-none">
          <div className="backdrop-blur-md bg-black/40 border border-white/10 p-8 rounded-2xl max-w-xl pointer-events-auto liquid-glass">
            <h1 className="text-6xl font-bold mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
              Our Pale Blue Dot.
            </h1>
            <p className="text-xl text-gray-300">
              Hover over the globe. Humanity exists in a fragile orbital neighborhood. Scroll to see the impending threats.
            </p>
          </div>
        </section>

        {/* Phase 1: The Swarm / Impact (100vh to 200vh) */}
        <section className="h-screen flex flex-col justify-center items-end px-12 md:px-24 pointer-events-none">
          <div className="backdrop-blur-md bg-black/40 border border-red-500/20 p-8 rounded-2xl max-w-xl text-right pointer-events-auto liquid-glass">
            <h2 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
              The Swarm Approaches
            </h2>
            <p className="text-xl text-gray-300">
              Over 36,000 near-Earth objects are tracked right now. The media narrative suggests constant, civilization-ending danger.
            </p>
          </div>
        </section>

        {/* Phase 2: The 3D Graph (200vh to 300vh) */}
        <section className="h-screen relative pointer-events-none">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-white/50 font-mono text-sm tracking-widest uppercase">
              1 week of real NASA data
            </p>
            <p className="text-white/30 font-mono text-xs mt-1">
              Each dot is a real tracked asteroid.
            </p>
          </div>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/30 font-mono text-xs tracking-widest uppercase">
            Miss Distance (log scale) →
          </div>
          <div
            className="absolute left-8 top-1/2 text-white/30 font-mono text-xs tracking-widest uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            Estimated Diameter (log scale) →
          </div>
        </section>

      </div>

      {/* ================================================================ */}
      {/* NARRATIVE SECTION — placed AFTER the scroll container.            */}
      {/* bg-[#050202] matches the scene background so it covers the fixed  */}
      {/* 3D canvas cleanly when you scroll past the graph.                 */}
      {/* ================================================================ */}
      <section className="relative z-20 w-full min-h-screen bg-[#050202] pt-28 pb-20">

        {/* Header */}
        <div className="max-w-3xl mx-auto px-8 md:px-16 mb-20 text-center">
          <p className="text-white/30 font-mono text-[10px] tracking-[0.5em] uppercase mb-6">The Science</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 text-white">
            The Reality of Planetary Defense
          </h2>
          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            The graph above looks empty because space is staggeringly vast. Media hype relies on ignoring this scale.
          </p>
        </div>

        {/* Horizontal swipe carousel */}
        <div
          className="flex overflow-x-auto snap-x snap-mandatory gap-8 px-8 md:px-16 pb-8 w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >

          {/* Card 1 — Chelyabinsk */}
          <article className="min-w-[80vw] md:min-w-[40vw] snap-center shrink-0 rounded-2xl p-8 flex flex-col gap-4 liquid-glass border border-white/5">
            <p className="text-white/30 font-mono text-[10px] tracking-[0.3em] uppercase">Feb 15, 2013</p>
            <h3 className="text-2xl font-bold tracking-tight text-white">
              The Chelyabinsk Event
            </h3>
            <p className="text-white/60 leading-relaxed">
              A 20-meter asteroid entered the atmosphere above Russia completely undetected. It released 30 times the energy of the Hiroshima bomb, injuring 1,500 people from shockwave-shattered glass.
            </p>
            <p className="text-white/40 leading-relaxed">
              This was not a planet-killer. It was a house-sized fragment — too small for telescopes to track — that came from the sun's blind spot. The real risk has always been small, fast, and undetected.
            </p>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-white/20 font-mono text-[10px] tracking-widest uppercase">Diameter: ~20m · Miss distance: 0 km · Detected: No</p>
            </div>
          </article>

          {/* Card 2 — The Danger Quadrant */}
          <article className="min-w-[80vw] md:min-w-[40vw] snap-center shrink-0 rounded-2xl p-8 flex flex-col gap-4 liquid-glass border border-white/5">
            <p className="text-white/30 font-mono text-[10px] tracking-[0.3em] uppercase">Reading the Graph</p>
            <h3 className="text-2xl font-bold tracking-tight text-white">
              The Empty Danger Quadrant
            </h3>
            <p className="text-white/60 leading-relaxed">
              The top-left of the scatter plot — large and close — is completely empty. This is not a rendering error. It is the most important fact in planetary defense.
            </p>
            <p className="text-white/40 leading-relaxed">
              Every asteroid large enough to cause extinction-level damage has been identified and is being tracked. They are all millions of miles away. We know where every one of them will be for the next 100 years. None are on a collision course.
            </p>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-white/20 font-mono text-[10px] tracking-widest uppercase">Source: NASA CNEOS</p>
            </div>
          </article>

          {/* Card 3 — DART Mission */}
          <article className="min-w-[80vw] md:min-w-[40vw] snap-center shrink-0 rounded-2xl p-8 flex flex-col gap-4 liquid-glass border border-white/5">
            <p className="text-white/30 font-mono text-[10px] tracking-[0.3em] uppercase">Sep 26, 2022</p>
            <h3 className="text-2xl font-bold tracking-tight text-white">
              NASA's DART Mission
            </h3>
            <p className="text-white/60 leading-relaxed">
              The Double Asteroid Redirection Test deliberately collided a spacecraft with Dimorphos, a 160-meter moonlet, and changed its orbital period by 33 minutes.
            </p>
            <p className="text-white/40 leading-relaxed">
              This proved kinetic impactor technology works. If we detect a threat decades in advance, we can nudge it off course. We are no longer passive observers.
            </p>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-white/20 font-mono text-[10px] tracking-widest uppercase">Orbital change: 33 min · Confirmed by Hubble + Webb</p>
            </div>
          </article>

          {/* End spacer */}
          <div className="min-w-[4vw] shrink-0" />
        </div>

        {/* Scroll hint */}
        <div className="flex items-center justify-center gap-3 mt-8 opacity-25">
          <div className="w-6 h-px bg-white rounded" />
          <span className="text-white font-mono text-[10px] tracking-[0.3em] uppercase">Swipe</span>
          <div className="w-6 h-px bg-white rounded" />
        </div>

        {/* Footer */}
        <div className="max-w-xl mx-auto px-8 mt-24 text-center">
          <p className="text-white/15 font-mono text-[10px] tracking-[0.3em] uppercase mb-2">Data source</p>
          <p className="text-white/30 text-sm leading-relaxed">
            Powered by live data from the{' '}
            <a
              href="https://api.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 underline underline-offset-4 hover:text-white/70 transition-colors pointer-events-auto"
            >
              NASA NeoWs API
            </a>
            . All asteroid positions are real close-approach data.
          </p>
        </div>
      </section>
    </main>
  );
}
