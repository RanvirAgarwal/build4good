# The Threat Matrix - Project Memory

## 1. Project Objective
A scroll-telling 3D visualization using NASA telemetry to debunk sensationalist media narratives about near-Earth asteroids. The app morphs thousands of 3D particles through different mathematical states based on the user's scroll position to prove the "Danger Quadrant" is actually empty.

## 2. Tech Stack
* **Framework:** React (Vite)
* **Styling:** Tailwind CSS (Modern, dark-mode deep space aesthetic)
* **3D Engine:** Vanilla Three.js mounted inside a React `useRef` (DO NOT USE React Three Fiber)
* **Animation:** GSAP for camera tweens, native `requestAnimationFrame` for 3D particle interpolation, native `window.addEventListener('scroll')` for scroll-driven morphing (NOT GSAP ScrollTrigger — it conflicts with React 18 strict mode)
* **Data Source:** NASA NeoWs API (Near Earth Object Web Service) via `utils/nasaApi.ts`. API key stored in `.env` (gitignored)

## 3. The 3D Particle States (The Core Mechanic)
The Three.js engine holds a constant array of ~15,000 particles. As the user scrolls, the target positions of these particles change, and the render loop interpolates them to the new shapes:
* **State 0 (0% Scroll): The Earth.** 14,850 particles accurately map a holographic Earth using Satellite Image Color UV sampling. 150 particles are designated comets, using fractional time offsets and exponential GLSL curves to streak from space.
* **State 1 (50% Scroll): The Swarm.** Particles expand into a chaotic vol simulating media's portrayal of constant asteroid danger.
* **State 2 (100% Scroll): The Reality Check.** Particles morph into a flat log-scale 3D scatter plot. ~100-180 real NASA asteroids are mapped to XY data coordinates (X=log10 miss distance, Y=log10 diameter). The remaining ~14,850 filler particles are faded out via the `aDataFlag` shader attribute. The top-left "Danger Quadrant" is empty because no real asteroids are both close AND large.

## 4. Architecture Notes
* **Scroll Engine:** Scroll fraction pinned to 300vh zone (`scrollZoneHeight = window.innerHeight * 3`), NOT total page height. This ensures the graph fully completes before the narrative carousel appears below.
* **Scroll Deadlock Fix:** `overflow-x-hidden` removed from `<main>`. `html` forced to `overflow-y: auto !important; height: auto !important` in index.css.
* **Particle Reconciliation (15k → ~100):** The `aDataFlag` float attribute (1.0 for real, 0.0 for filler) is passed to vertex shader. During Swarm→Matrix transition, filler particles' `gl_PointSize` → 0.0 and alpha fades via `smoothstep`.
* **Ghost Raycaster Bug Fix:** `THREE.Raycaster` was checking the `position` attribute (Earth coords). The GPU shader visually moved points to `aMatrix` space. Fix: a manual NDC projection loop reads `geometry.attributes.aMatrix` directly, applies `particles.matrixWorld`, then projects to 2D NDC for distance checking. CPU and GPU now agree on point positions.
* **Mouse Repel Disabled at Graph State:** GLSL repel logic is gated by `if (uProgress < 1.5)` so it only fires during Earth/Swarm phases. The graph is static for accurate hover/click detection.
* **API Key Security:** NASA key stored in `.env` as `VITE_NASA_API_KEY`, accessed via `import.meta.env.VITE_NASA_API_KEY`. `.gitignore` ignores all `.env*` files.

## 5. Interactive Features
### Hover HUD
* Fires via custom NDC projection loop (not Raycaster) reading `aMatrix` buffer directly
* Shows: Asteroid name, diameter (m/km auto-formatted), miss distance (LD + AU), velocity (km/s)
* PHO badge pulses red if `isPotentiallyHazardous`
* Hint text: "Click to analyse impact"

### Click → Kinetic Impact Overlay
* Clicking an asteroid in graph state triggers `setSelectedAsteroid`
* Full-screen `KineticImpactOverlay` component with:
  * **Left panel:** Kinetic energy physics (mass, velocity → MT TNT), concentric CSS blast circles vs Chelyabinsk / Castle Bravo / Tsar Bomba / Regional Impact references
  * **Right panel:** Glossary — LD, AU, PHO, NEO definitions
  * Physics: `KE = 0.5 × mass × v²`, `mass = (4/3)πr³ × 3000 kg/m³`, `MT = KE / 4.184e15`
* Close with "← Back to Matrix" button or Escape key

### Temporal Timeline
* UI at bottom of Phase 2 (graph) section
* Three presets:
  * **Current Week** — today's 7-day window
  * **Chelyabinsk (Feb 2013)** — `startDate: '2013-02-11'`
  * **Apophis (Apr 2029)** — `startDate: '2029-04-07'`
* Timeline selection calls `fetchNasaData(startDate?)` with new date, updates `nasaData` React state in Home.tsx
* `nasaData` is passed as prop to `ParticleScene`, which hot-swaps GPU buffers in a separate `useEffect`
* Visual feedback: GSAP pulse animation (`scale 0.88 → 1.0, back.out easing`) on buffer update

## 6. `ParticleScene` Prop API
```typescript
interface ParticleSceneProps {
  onHover?:          (info: HoverInfo | null) => void;
  onClickAsteroid?:  (asteroid: NeoAsteroid) => void;
  nasaData?:         NeoAsteroid[];  // External — triggers buffer hot-swap on change
}
```
* **Two useEffects:** Scene setup runs once (`[]`). Buffer hot-swap runs on `[externalNasaData]`.
* **Refs:** `geometryRef`, `particlesRef`, `nasaDataRef` shared between effects.

## 7. `fetchNasaData` API
```typescript
fetchNasaData(startDate?: string): Promise<NeoAsteroid[]>
// startDate: ISO 'YYYY-MM-DD'. Fetches that date + 7 days. Defaults to today.
```

## 8. Project Status
* [x] WebGL Foundation & 3D particle system
* [x] Math engine & target generation
* [x] Scroll-telling narrative UI
* [x] High-res Earth map (satellite UV sampling)
* [x] Gravitational comet strikes
* [x] Live NASA NeoWs integration
* [x] Ghost Raycaster fix (aMatrix NDC projection loop)
* [x] Temporal Timeline (historical/future date windows)
* [x] Kinetic Impact Overlay (physics + blast circles + glossary)
* [x] Dynamic GPU buffer hot-swap on timeline change
