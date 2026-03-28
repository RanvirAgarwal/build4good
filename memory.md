# The Threat Matrix - Project Memory

## 1. Project Objective
A scroll-telling 3D visualization using NASA telemetry to debunk sensationalist media narratives about near-Earth asteroids. The app morphs thousands of 3D particles through different mathematical states based on the user's scroll position to prove the "Danger Quadrant" is actually empty.

## 2. Tech Stack
* **Framework:** React (Next.js/Vite depending on current repo state)
* **Styling:** Tailwind CSS (Modern, dark-mode space aesthetic, semi-transparent overlays)
* **3D Engine:** Vanilla Three.js mounted inside a React `useRef` (DO NOT USE React Three Fiber).
* **Animation:** GSAP for UI/Camera tweens, native `requestAnimationFrame` for 3D particle interpolation.

## 3. The 3D Particle States (The Core Mechanic)
The Three.js engine holds a constant array of ~4,000 particles. As the user scrolls, the target positions of these particles change, and the render loop interpolates them to the new shapes:
* **State 1 (0% Scroll): The Swarm.** A chaotic, uniform 3D spherical distribution representing the media panic of asteroids surrounding Earth.
* **State 2 (50% Scroll): The Reality Check.** A base-10 logarithmic 3D scatter plot. X-Axis = Miss Distance, Y-Axis = Estimated Diameter.
* **State 3 (100% Scroll): The Home.** Particles map to a 3D Earth, formed by sampling a black-and-white equirectangular image mask of the continents.

## 4. Current Status
* [x] Initialize Memory
* [x] Phase 1: Clean slate & WebGL Foundation
* [x] Phase 2: Math Engine & Target Generation
* [x] Phase 3: Scroll-telling Narrative UI Overhaul
* [x] Phase 4: Native Browser Image Sampling & Three.js Architecture Refactoring
