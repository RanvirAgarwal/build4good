# The Threat Matrix - Project Memory

## 1. Project Objective
A scroll-telling 3D visualization using NASA telemetry to debunk sensationalist media narratives about near-Earth asteroids. The app morphs thousands of 3D particles through different mathematical states based on the user's scroll position to prove the "Danger Quadrant" is actually empty.

## 2. Tech Stack
* **Framework:** React (Vite)
* **Styling:** Tailwind CSS (Modern, dark-mode space aesthetic, semi-transparent overlays)
* **3D Engine:** Vanilla Three.js mounted inside a React `useRef` (DO NOT USE React Three Fiber).
* **Animation:** GSAP for camera tweens, native `requestAnimationFrame` for 3D particle interpolation, native `window.addEventListener('scroll')` for scroll-driven morphing (NOT GSAP ScrollTrigger — it conflicts with React 18 strict mode).
* **Data Source:** NASA NeoWs API (Near Earth Object Web Service) via `utils/nasaApi.ts`. API key stored in `.env` (gitignored).

## 3. The 3D Particle States (The Core Mechanic)
The Three.js engine holds a constant array of ~15,000 particles. As the user scrolls, the target positions of these particles change, and the render loop interpolates them to the new shapes:
* **State 0 (0% Scroll): The Threat.** 14,850 particles accurately map a holographic Earth using true Satellite Image Color UV sampling. 150 particles are designated as deep-space comets, utilizing fractional time offsets and exponential GLSL curves to visually "drop" from space and streak through the atmosphere.
* **State 1 (50% Scroll): The Chaos.** The swarm rapidly expands, creating a chaotic volume simulating the media's portrayal of constant asteroid danger.
* **State 2 (100% Scroll): The Reality Check.** Particles morph into a flat, log-scale 3D scatter plot. ~100-180 real NASA asteroids are mapped to data coordinates (X=log10 miss distance, Y=log10 diameter). The remaining ~14,850 filler particles are elegantly faded out via the `aDataFlag` shader attribute, leaving only the real data visible. The top-left "Danger Quadrant" is naturally empty because no real asteroids are both close AND large.

## 4. Architecture Notes
* **Scroll Deadlock Fix:** `overflow-x-hidden` removed from `<main>` in Home.tsx. `html` element forced to `overflow-y: auto !important; height: auto !important` in index.css. Scroll handled by native `window.addEventListener('scroll')` — NOT GSAP ScrollTrigger.
* **Particle Reconciliation (15k → ~100):** The `aDataFlag` float attribute (1.0 for real asteroids, 0.0 for filler) is passed to the vertex shader. During the Swarm→Matrix transition (`uProgress` 1.0→2.0), filler particles' `gl_PointSize` is smoothly reduced to 0.0 and their alpha fades via `smoothstep`, so only real NASA data points remain visible.
* **API Key Security:** NASA key stored in `.env` as `VITE_NASA_API_KEY`, accessed via `import.meta.env.VITE_NASA_API_KEY`. The `.gitignore` already ignores all `.env*` files.

## 5. Current Status
* [x] Initialize Memory
* [x] Phase 1: Clean slate & WebGL Foundation
* [x] Phase 2: Math Engine & Target Generation
* [x] Phase 3: Scroll-telling Narrative UI Overhaul
* [x] Phase 4: Native Browser Image Sampling & Three.js Architecture Refactoring
* [x] Phase 5: High-Res Particle System Integration (15k points)
* [x] Phase 6: Minimalist Gravitational Comet Strikes
* [x] Phase 7: Scroll Deadlock Fix & Live NASA NeoWs Integration
