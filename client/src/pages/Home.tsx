import React from 'react';
import { ParticleScene } from '../components/ParticleScene';

export default function Home() {
  return (
    <main className="relative w-full min-h-[300vh] text-white font-sans selection:bg-cyan-500/30">
      <ParticleScene />

      {/* Navigation */}
      <nav className="fixed top-0 w-full p-6 lg:p-10 flex justify-between items-center z-[100] bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="font-bold tracking-[0.2em] text-sm lg:text-lg">THE THREAT MATRIX</div>
        <div className="hidden md:flex space-x-12 text-[10px] tracking-[0.3em] font-light uppercase opacity-50">
           NASA NEO API DATA
        </div>
      </nav>

      {/* 300vh scrolling container */}
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
              Over 4,000 near-Earth objects orbit our planet right now. The media narrative suggests constant, civilization-ending danger.
            </p>
          </div>
        </section>

        {/* Phase 2: The 3D Graph (200vh to 300vh) */}
        {/* Intentionally left empty of text boxes so the graph can be viewed cleanly */}
        <section className="h-screen relative pointer-events-none">
            {/* Absolute positioned axis labels for the graph */}
            <div className="absolute bottom-20 right-20 text-red-400 font-mono tracking-widest text-sm uppercase opacity-70">
              Axis X ➔ Estimated Miss Distance
            </div>
            <div className="absolute top-20 left-20 text-red-400 font-mono tracking-widest text-sm uppercase opacity-70" style={{ writingMode: 'vertical-rl' }}>
              Axis Y ➔ Asteroid Diameter
            </div>
        </section>

      </div>
    </main>
  );
}
