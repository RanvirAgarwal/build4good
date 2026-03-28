import React, { useEffect, useState } from 'react';
import { ParticleScene } from '../components/ParticleScene';

export default function Home() {
  const [scrollIndex, setScrollIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      
      // Calculate active section based on scroll
      if (scrollY < vh * 0.5) setScrollIndex(0);
      else if (scrollY < vh * 1.5) setScrollIndex(1);
      else setScrollIndex(2);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="relative w-full text-white font-sans overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full p-6 lg:p-10 flex justify-between items-center z-[100] bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="font-bold tracking-[0.2em] text-sm lg:text-lg">THE THREAT MATRIX</div>
        <div className="hidden md:flex space-x-12 text-[10px] tracking-[0.3em] font-light uppercase opacity-50">
           NASA NEO API DATA
        </div>
      </nav>

      {/* Fixed 3D Background */}
      <ParticleScene scrollIndex={scrollIndex} />

      {/* Scrolling Foreground Container */}
      <div className="relative z-10 w-full">
        
        {/* Phase 1: The Swarm */}
        <section className="h-[100vh] flex flex-col justify-center items-start px-6 lg:px-[10%] relative pointer-events-auto">
          <div className="max-w-3xl backdrop-blur-md bg-black/30 border border-white/10 p-8 lg:p-12 rounded-3xl liquid-glass">
            <h1 className="text-5xl md:text-8xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500" style={{ textShadow: "0 0 20px rgba(34,211,238,0.2)" }}>
              The Swarm
            </h1>
            <p className="text-lg md:text-xl font-light opacity-90 max-w-lg leading-relaxed text-gray-200">
              Over 4,000 tracked near-Earth objects orbit our planet right now. The media narrative suggests constant danger.
            </p>
          </div>
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-xs tracking-[0.3em] opacity-50 uppercase animate-pulse">
            Scroll to Analyze
          </div>
        </section>

        {/* Filler Space */}
        <div className="h-[50vh]"></div>

        {/* Phase 2: The Matrix */}
        <section className="h-[120vh] flex flex-col justify-center items-end px-6 lg:px-[10%] relative pointer-events-auto text-right">
          <div className="max-w-2xl backdrop-blur-md bg-black/30 border border-white/10 p-8 lg:p-12 rounded-3xl liquid-glass">
            <h2 className="text-4xl md:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500" style={{ textShadow: "0 0 20px rgba(251,146,60,0.2)" }}>
              The Reality Check
            </h2>
            <p className="text-lg md:text-xl font-light opacity-90 leading-relaxed text-gray-200">
              Let's map the math. When we plot Distance (X) against Size (Y), a new truth emerges.
            </p>
          </div>
          
          {/* Axis Labels */}
          <div className="absolute top-[20%] right-[10%] opacity-50 text-xs tracking-[0.3em] uppercase">
            MASSIVE & HAZARDOUS (TOP RIGHT)
          </div>
          <div className="absolute bottom-[20%] left-[10%] opacity-50 text-xs tracking-[0.3em] uppercase">
            SMALL & CLOSE (BOTTOM LEFT)
          </div>
        </section>

        {/* Filler Space */}
        <div className="h-[50vh]"></div>

        {/* Phase 3: The Earth */}
        <section className="h-[100vh] flex flex-col justify-center items-center px-6 lg:px-[10%] relative pointer-events-auto text-center pb-32">
          <div className="max-w-4xl backdrop-blur-md bg-black/30 border border-white/10 p-8 lg:p-16 rounded-3xl liquid-glass w-full">
            <h2 className="text-5xl md:text-8xl font-bold mb-8 text-white relative z-10" style={{ textShadow: "0 0 20px rgba(255,255,255,0.4)" }}>
              The Danger Quadrant<br/>is Empty.
            </h2>
            <p className="text-xl md:text-3xl font-light opacity-90 max-w-2xl mx-auto leading-relaxed mb-6 text-gray-200 relative z-10">
              The massive rocks are millions of miles away.
            </p>
            <p className="text-base font-light opacity-60 max-w-xl mx-auto border-t border-white/10 pt-6 relative z-10">
              The ones that come close are statistically insignificant. Our cosmic neighborhood is safe. Look at the data, not the headlines.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
