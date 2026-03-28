# The Threat Matrix - Project Memory

## 1. Project Objective
A scroll-telling 3D visualization using NASA telemetry to debunk sensationalist media narratives about near-Earth asteroids. The app morphs thousands of 3D particles through different mathematical states based on the user's scroll position to prove the "Danger Quadrant" is actually empty.

## 2. Tech Stack
* **Framework:** React (Next.js/Vite depending on current repo state)
* **Styling:** Tailwind CSS (Modern, dark-mode space aesthetic, semi-transparent overlays)
* **3D Engine:** Vanilla Three.js mounted inside a React `useRef` (DO NOT USE React Three Fiber).
* **Animation:** GSAP for UI/Camera tweens, native `requestAnimationFrame` for 3D particle interpolation.

## 3. The 3D Particle States (The Core Mechanic)
The Three.js engine holds a constant array of ~15,000 particles. As the user scrolls, the target positions of these particles change, and the render loop interpolates them to the new shapes:
* **State 0 (0% Scroll): The Threat.** 14,850 particles accurately map a holographic Earth using true Satellite Image Color UV sampling. 150 particles are designated as deep-space comets, utilizing fractional time offsets and exponential GLSL curves to visually "drop" from space and streak through the atmosphere.
* **State 1 (50% Scroll): The Chaos.** The swarm rapidly expands, creating a chaotic volume simulating the media's portrayal of constant asteroid danger.
* **State 2 (100% Scroll): The Reality Check.** The particles neatly collapse into a flattened, structured 3D Glass Slab scatter plot. The top-left "Danger Quadrant" is mathematically forced to be completely empty, bringing resolution to the narrative.

## 4. Current Status
* [x] Initialize Memory
* [x] Phase 1: Clean slate & WebGL Foundation
* [x] Phase 2: Math Engine & Target Generation
* [x] Phase 3: Scroll-telling Narrative UI Overhaul
* [x] Phase 4: Native Browser Image Sampling & Three.js Architecture Refactoring
* [x] Phase 5: High-Res Particle System Integration (15k points)
* [x] Phase 6: Minimalist Gravitational Comet Strikes & Matrix Slabs
