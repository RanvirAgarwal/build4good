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
          {/* HTML axis labels — fade in via CSS alongside 3D sprites */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-orange-500/60 font-mono text-xs tracking-widest uppercase">
            X axis → Miss Distance (log scale)
          </div>
          <div
            className="absolute left-8 top-1/2 -translate-y-1/2 text-orange-500/60 font-mono text-xs tracking-widest uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            Y axis → Estimated Diameter (log scale)
          </div>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-red-500/80 font-mono text-sm tracking-widest uppercase">
              This is 1 week of real NASA data.
            </p>
            <p className="text-white/40 font-mono text-xs mt-1">
              Each dot is a real tracked asteroid.
            </p>
          </div>
        </section>

      </div>

      {/* ================================================================ */}
      {/* NARRATIVE SECTION — below the 3D scroll experience               */}
      {/* ================================================================ */}
      <section className="relative z-20 w-full bg-[#050202] py-24">

        {/* Header */}
        <div className="max-w-4xl mx-auto px-8 md:px-16 mb-16 text-center">
          <p className="text-orange-500 font-mono text-xs tracking-[0.4em] uppercase mb-4">The Science</p>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6 text-white">
            The Reality of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
              Planetary Defense.
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            The graph above looks empty because{' '}
            <span className="text-orange-400 font-semibold">space is staggeringly vast.</span>{' '}
            Media hype relies on ignoring this scale. Here is what the data actually tells us.
          </p>
        </div>

        {/* Horizontal swipe carousel */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 px-8 md:px-16 pb-10 w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* Card 1 — Chelyabinsk */}
          <article className="min-w-[85vw] md:min-w-[42vw] lg:min-w-[36vw] snap-center shrink-0 rounded-3xl p-8 flex flex-col gap-5 liquid-glass border border-white/5 bg-gradient-to-br from-orange-950/30 to-black/60">
            <div className="flex items-center gap-3">
              <span className="text-3xl">☄️</span>
              <span className="text-orange-400 font-mono text-xs tracking-[0.3em] uppercase">Feb 15, 2013</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-white">
              The Chelyabinsk Event
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              A <span className="text-orange-400 font-semibold">20-meter</span> asteroid entered the atmosphere above Russia completely undetected. It released 30× the energy of the Hiroshima bomb, injuring 1,500 people with shockwave-broken glass.
            </p>
            <p className="text-gray-400 leading-relaxed">
              The punchline? This was <em>not</em> a massive, planet-killer rock. It was a house-sized fragment—too small for our telescopes to track at the time—that snuck in from the sun's blind spot. The real risk is{' '}
              <span className="text-white font-semibold">small, fast, and undetected.</span>
            </p>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-orange-500/70 font-mono text-xs tracking-widest uppercase">Diameter: ~20m · Miss distance: 0 km · Detected: No</p>
            </div>
          </article>

          {/* Card 2 — The Danger Quadrant */}
          <article className="min-w-[85vw] md:min-w-[42vw] lg:min-w-[36vw] snap-center shrink-0 rounded-3xl p-8 flex flex-col gap-5 liquid-glass border border-red-900/30 bg-gradient-to-br from-red-950/30 to-black/60">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <span className="text-red-400 font-mono text-xs tracking-[0.3em] uppercase">Reading the Graph</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-white">
              The Empty Danger Quadrant
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Look at the top-left of the scatter plot above. That region—{' '}
              <span className="text-red-400 font-semibold">large AND close</span>—is completely empty. This is not a bug. It is the most important scientific fact in planetary defense.
            </p>
            <p className="text-gray-400 leading-relaxed">
              Every asteroid large enough to cause civilization-level damage (<span className="text-white font-semibold">&gt;1km</span>) has been identified and is being tracked. They are all millions of miles away. We know where every one of them will be for the next 100 years. <em>None</em> are on a collision course.
            </p>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-red-500/70 font-mono text-xs tracking-widest uppercase">Source: NASA Center for Near Earth Object Studies (CNEOS)</p>
            </div>
          </article>

          {/* Card 3 — DART Mission */}
          <article className="min-w-[85vw] md:min-w-[42vw] lg:min-w-[36vw] snap-center shrink-0 rounded-3xl p-8 flex flex-col gap-5 liquid-glass border border-cyan-900/30 bg-gradient-to-br from-cyan-950/30 to-black/60">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              <span className="text-cyan-400 font-mono text-xs tracking-[0.3em] uppercase">Sep 26, 2022</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-white">
              NASA's DART Mission
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              The Double Asteroid Redirection Test deliberately crashed a spacecraft into{' '}
              <span className="text-cyan-400 font-semibold">Dimorphos</span>, a 160-meter moonlet, and successfully changed its orbital period by{' '}
              <span className="text-cyan-300 font-bold">33 minutes.</span>
            </p>
            <p className="text-gray-400 leading-relaxed">
              This proved that kinetic impactor technology works. If we detect a threat decades in advance—which our tracking systems are now capable of—we can nudge it off course. The equation has changed.{' '}
              <span className="text-white font-semibold">We are no longer passive observers.</span>
            </p>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-cyan-500/70 font-mono text-xs tracking-widest uppercase">Orbital period change: 33 min · Confirmation: Hubble + Webb</p>
            </div>
          </article>

          {/* Spacer to allow last card to snap properly */}
          <div className="min-w-[4vw] shrink-0" />
        </div>

        {/* Scroll hint */}
        <div className="flex items-center justify-center gap-3 mt-6 opacity-40">
          <div className="w-8 h-[2px] bg-orange-500 rounded" />
          <span className="text-orange-500 font-mono text-xs tracking-widest uppercase">Swipe to explore</span>
          <div className="w-8 h-[2px] bg-orange-500 rounded" />
        </div>

        {/* Footer / CTA */}
        <div className="max-w-2xl mx-auto px-8 mt-24 text-center">
          <p className="text-white/20 font-mono text-xs tracking-[0.3em] uppercase mb-3">Data source</p>
          <p className="text-white/50 text-sm leading-relaxed">
            Visualisation powered by live data from the{' '}
            <a
              href="https://api.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 underline underline-offset-4 hover:text-orange-300 transition-colors pointer-events-auto"
            >
              NASA NeoWs API
            </a>
            . Updated weekly. All asteroid positions are real close-approach data.
          </p>
        </div>
      </section>
    </main>
  );
}
