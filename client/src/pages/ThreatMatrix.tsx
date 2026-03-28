import React, { useState, useEffect } from 'react';
import { ParticleScene } from '@/components/ParticleScene';

/**
 * Threat Matrix Page - Scroll-Telling Experience
 * 
 * The page uses a 300vh scroll height to morph the 3D particle system:
 * - 0-100vh: "The Swarm" - Sensationalist narrative
 * - 100-200vh: "The Reality Check" - Logarithmic scale explanation
 * - 200-300vh: "The Danger Quadrant is Empty" - Data insights
 */

export default function ThreatMatrix() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = scrollTop / docHeight;
      setScrollProgress(Math.min(scrolled, 1));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate opacity for each section based on scroll
  const getOpacity = (start: number, end: number) => {
    if (scrollProgress < start) return 0;
    if (scrollProgress > end) return 0;
    return Math.min((scrollProgress - start) / 0.1, 1);
  };

  return (
    <div className="relative bg-gradient-to-br from-[hsl(0,0%,5%)] to-[hsl(0,0%,8%)]">
      {/* Fixed 3D Scene Background */}
      <div className="fixed inset-0 z-0">
        <ParticleScene scrollProgress={scrollProgress} />
      </div>

      {/* Scrollable Content Container (300vh height) */}
      <div className="relative z-10 h-[300vh]">
        
        {/* Section 1: The Swarm (0-100vh) */}
        <div className="h-screen flex items-center justify-start pl-12 lg:pl-20">
          <div
            className="max-w-xl"
            style={{
              opacity: getOpacity(0, 0.33),
              transform: `translateY(${Math.max(0, (0.33 - scrollProgress) * 100)}px)`,
              transition: 'opacity 0.3s ease-out',
            }}
          >
            <div className="text-xs tracking-widest uppercase text-white/50 mb-4">
              Phase One
            </div>
            <h2 className="text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight">
              The <em className="italic-serif">Swarm</em>
            </h2>
            <p className="text-lg text-white/80 mb-6 leading-relaxed">
              Thousands of rocks are orbiting our planet right now. Headlines scream about 
              near-Earth objects. Media sensationalizes every asteroid discovery. But what does 
              the data actually tell us?
            </p>
            <div className="liquid-glass rounded-lg px-6 py-4">
              <p className="text-sm text-white/70">
                "Sensationalism sells, but understanding saves lives."
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: The Reality Check (100-200vh) */}
        <div className="h-screen flex items-center justify-start pl-12 lg:pl-20">
          <div
            className="max-w-xl"
            style={{
              opacity: getOpacity(0.33, 0.66),
              transform: `translateY(${Math.max(0, (0.66 - scrollProgress) * 100)}px)`,
              transition: 'opacity 0.3s ease-out',
            }}
          >
            <div className="text-xs tracking-widest uppercase text-white/50 mb-4">
              Phase Two
            </div>
            <h2 className="text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight">
              The <em className="italic-serif">Reality Check</em>
            </h2>
            <p className="text-lg text-white/80 mb-6 leading-relaxed">
              Watch as the chaotic swarm transforms into an organized scatter plot. 
              The X-axis represents distance (logarithmic scale), the Y-axis represents size. 
              This is where the truth emerges.
            </p>
            <div className="space-y-4">
              <div className="liquid-glass rounded-lg px-6 py-4">
                <p className="text-sm font-semibold text-white mb-2">Size vs. Distance</p>
                <p className="text-xs text-white/70">
                  Larger asteroids are typically farther away. Closer asteroids are usually smaller.
                </p>
              </div>
              <div className="liquid-glass rounded-lg px-6 py-4">
                <p className="text-sm font-semibold text-white mb-2">Logarithmic Scaling</p>
                <p className="text-xs text-white/70">
                  We use log scales to compress vast ranges of data into readable visualizations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: The Danger Quadrant (200-300vh) */}
        <div className="h-screen flex items-center justify-start pl-12 lg:pl-20">
          <div
            className="max-w-xl"
            style={{
              opacity: getOpacity(0.66, 1),
              transform: `translateY(${Math.max(0, (1 - scrollProgress) * 100)}px)`,
              transition: 'opacity 0.3s ease-out',
            }}
          >
            <div className="text-xs tracking-widest uppercase text-white/50 mb-4">
              Phase Three
            </div>
            <h2 className="text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight">
              The Danger Quadrant <em className="italic-serif">is Empty</em>
            </h2>
            <p className="text-lg text-white/80 mb-6 leading-relaxed">
              The upper-right quadrant—where massive rocks are close to Earth—remains empty. 
              This is the fundamental insight: large asteroids that could threaten civilization 
              are detected far in advance.
            </p>
            <div className="space-y-4">
              <div className="liquid-glass rounded-lg px-6 py-4">
                <p className="text-sm font-semibold text-white mb-2">✓ Detection & Tracking</p>
                <p className="text-xs text-white/70">
                  NASA and international agencies monitor near-Earth objects continuously.
                </p>
              </div>
              <div className="liquid-glass rounded-lg px-6 py-4">
                <p className="text-sm font-semibold text-white mb-2">✓ Early Warning</p>
                <p className="text-xs text-white/70">
                  Hazardous asteroids are identified years or decades before closest approach.
                </p>
              </div>
              <div className="liquid-glass rounded-lg px-6 py-4">
                <p className="text-sm font-semibold text-white mb-2">✓ Data-Driven Reality</p>
                <p className="text-xs text-white/70">
                  Science, not sensationalism, is our best defense against cosmic threats.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      <div className="fixed bottom-8 right-8 z-20 flex flex-col items-end gap-4">
        <div className="text-xs text-white/50 uppercase tracking-widest">
          {Math.round(scrollProgress * 100)}%
        </div>
        <div className="w-1 h-32 bg-white/10 rounded-full overflow-hidden">
          <div
            className="w-full bg-white/60 rounded-full transition-all duration-300"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
