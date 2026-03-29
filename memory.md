# The Threat Matrix — Project Memory

> Last updated: 2026-03-29 (Final major update)

---

## 1. Project Objective

A scroll-telling 3D data visualization using live NASA NeoWs telemetry to debunk sensationalist media about near-Earth asteroids. The app morphs ~15,000 GPU-accelerated particles through three distinct mathematical states as the user scrolls, culminating in a real-time scatter plot that proves the "Danger Quadrant" (close **and** large) is statistically empty.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React + Vite | TypeScript throughout |
| Styling | Tailwind CSS v4 + custom CSS | Dark deep-space aesthetic, `Satoshi-Variable` font |
| 3D Engine | Vanilla Three.js in `useRef` | **Never use React Three Fiber** — causes re-render hell |
| Animation | GSAP tweens + native `requestAnimationFrame` | No GSAP ScrollTrigger (conflicts React 18 strict mode) |
| Scroll | Native `window.addEventListener('scroll')` | Pinned 300 vh zone |
| Data | NASA NeoWs API via `utils/nasaApi.ts` | `VITE_NASA_API_KEY` in `.env` (gitignored) |
| Package manager | `pnpm` | Use `pnpm`, never `npm` |

---

## 3. Particle States (Core Mechanic)

~15,000 particles held in GPU buffers. Scroll drives `uProgress` uniform (0 → 2), GLSL interpolates positions:

| Progress | State | Description |
|----------|-------|-------------|
| 0.0 | **Earth** | UV-sampled holographic globe from satellite texture. 150 comet particles streak in. |
| 1.0 | **Swarm** | Particles explode into chaotic cloud — media's asteroid horror narrative. |
| 2.0 | **Threat Matrix** | Log-scale 3D scatter plot. Real NASA data mapped (X = miss distance, Y = diameter). Filler particles fade out via `aDataFlag` shader attribute. |

### Key Shader Attributes
- `aMatrix` — target position in scatter plot space (read by NDC hover loop)
- `aEarth` — UV-sampled Earth sphere position
- `aSwarm` — chaotic swarm position
- `aDataFlag` — 1.0 for real NASA asteroid, 0.0 for filler (filler → invisible at graph phase)

---

## 4. Architecture Notes

- **Scroll Engine:** Fraction pinned to `scrollZoneHeight = window.innerHeight * 3`. Graph completes before narrative carousel appears below.
- **Ghost Raycaster Fix:** `THREE.Raycaster` reads `position` (Earth coords). The GPU moved points to `aMatrix` space. Fix: manual NDC projection loop reads `geometry.attributes.aMatrix`, applies `particles.matrixWorld`, projects to 2D NDC. CPU/GPU now agree.
- **Mouse Repel:** GLSL repel gated by `if (uProgress < 1.5)` — fires only on Earth/Swarm phases, disabled at graph phase for accurate picking.
- **Buffer Hot-Swap:** Two separate `useEffect`s in `ParticleScene`. Scene setup runs once (`[]`). NASA buffer update runs on `[externalNasaData]` — replaces `aMatrix` attributes without scene teardown.
- **Click Gating:** `clickEnabledRef` prop prevents asteroid clicks while overlays are open.
- **API Key:** `VITE_NASA_API_KEY` in `.env`. Falls back to mock data if API fails.

---

## 5. Origin Earth (Small Map View)

A holographic Earth rendered at scatter plot origin position `(-9, -4.5, 0)`:
- **Textured sphere** — `THREE.TextureLoader` loads `/earth-color.jpg` → `MeshBasicMaterial({ map: tex })`, `SphereGeometry(0.72, 32, 24)`
- No wireframe overlay, no atmosphere sphere (both removed to avoid blue outline artifact)
- Opacity controlled by `originEarthMats[]` array, fades in only when `p > 0.8` (graph nearly fully formed — avoids interfering with swarm phase)
- Spins in render loop: `earthGroup.rotation.y += 0.005`

---

## 6. Interactive Features

### Hover (Main Scatter Plot)
- Custom NDC projection loop (not Raycaster) reading `aMatrix` directly
- Shows: name, diameter (auto m/km), miss distance (LD + AU), velocity (km/s), "Click to analyse" hint

### Click → Kinetic Impact Overlay (Small View — `KineticOverlay` in `Home.tsx`)
- Triggered by clicking asteroids in the scatter plot
- Full-screen glass overlay (liquid-glass-strong + backdrop-blur)
- **Header:** Asteroid name · Object Type badge (Planetary Threat / Hazardous Asteroid / Large Asteroid / Asteroid / Small Asteroid / Meteoroid / Micrometeorite) · PHO badge · Risk badge (LOW/MODERATE/ELEVATED/CRITICAL)
- **Left panel:** Proximity (LD + AU), Size (m/km + damage class), Kinetic Yield (`KE = ½mv²`, `ρ = 3000 kg/m³`), Comparison bars (Hiroshima / Chelyabinsk / Castle Bravo / Tsar Bomba, log-normalized widths)
- **Right panel:** Threat Consensus (verdict, impact probability, damage class, Active Defenses), LD / AU / PHO glossary cards
- No scrollbars — everything `flex-1 min-h-0 overflow-hidden`, fits in one viewport
- Close with ← Back or Escape

### Temporal Timeline (Main View)
- Glass pill bar at bottom of graph phase
- Preset buttons: Now / −14d / −7d / +7d / +14d
- Custom dark-themed `<input type="date">` picker
- Fetches `fetchNasaData(startDate?)` and hot-swaps asteroid GPU buffers

---

## 7. 3D Space View (`SpaceView3D.tsx`)

Full-screen overlay opened via **⊕ 3D Space View** glass button (top-right of graph HUD):
- **Three.js scene (separate from main):** Stars (4,000 pts), Earth, asteroids, LD reference rings
- **Earth model:**
  - Solid textured sphere (`MeshBasicMaterial({ map: earth-color.jpg })`, `SphereGeometry(2.45, 48, 32)`)
  - UV-sampled particle cloud (6,000 pts from `earth-color.jpg` — shows real continent colors)
  - Atmosphere glow (`BackSide` sphere, opacity 0.07)
  - Equatorial ring line
- **Asteroid positions:** Stable pseudo-random from `strHash(neo.name)` — no visible spiral pattern. Ecliptic-biased inclination (±30° from equatorial plane, matching real NEO population). Log-scaled LD radial distance.
- **Asteroid dots:** Size 0.5, soft circular canvas texture, orange-amber for NEOs, red for PHOs
- **LD reference rings:** 5/10/20/40 LD at `y=0` ecliptic plane
- **Orbit controls:** Mouse drag → spherical θ/φ orbit, scroll wheel → zoom (4–200 units)
- **Timeline:** Same presets as main view + custom date, hot-swaps asteroid buffers without rebuilding scene
- **Hover tooltip:** Shows name + LD + PHO warning + "click for details"
- **Click → AsteroidDetail:** Full-screen impact analysis panel overlaid at `z-[200]`
- **ESC** closes SpaceView3D

---

## 8. Asteroid Detail Page (`AsteroidDetail.tsx`)

Opened by clicking any asteroid in SpaceView3D. Renders as absolute `z-[200]` overlay (3D scene stays mounted):
- Same glass aesthetic as KineticOverlay
- **Header:** ← Back · Name · Object Type badge · PHO badge · Risk badge · "Impact Analysis"
- **Left column:** Proximity card (cyan LD stat), Size card (white diameter + damage class), Kinetic Yield card (orange GT/MT), Comparison bars
- **Right column:** Threat Consensus (verdict + defenses), LD card, AU card, PHO ✓/✗ card
- Same physics as KineticOverlay (`calcYield`, `riskLevel`, `REFS`)
- No scrollbars — pure flex viewport fill

---

## 9. Object Classification System

Used in both `KineticOverlay` and `AsteroidDetail`:

| Label | Condition | Color |
|-------|-----------|-------|
| Planetary Threat | PHO + ≥140m | `#ff2600` |
| Hazardous Asteroid | PHO + <140m | `#ff5500` |
| Large Asteroid | ≥1 km | `#fb923c` |
| Asteroid | ≥100m | `#fbbf24` |
| Small Asteroid | ≥25m | `#d4b483` |
| Meteoroid | ≥1m | `#a8997a` |
| Micrometeorite | <1m | `#777777` |

---

## 10. Glassmorphism Design System

Defined in `index.css` (`@layer components`):

- `.liquid-glass` — `backdrop-filter: blur(4px)`, very subtle bg, `::before` gradient border (top/bottom shimmer)
- `.liquid-glass-strong` — `backdrop-filter: blur(50px)`, stronger inset shadow, `::before` stronger shimmer
- Both use `::before` with `linear-gradient(180deg, rgba(255,255,255,0.45)→transparent→rgba(255,255,255,0.45))` + `mask-composite: exclude` to create gradient border effect
- Font: `Satoshi-Variable` loaded via `@font-face`

---

## 11. Key File Map

```
client/src/
├── pages/
│   └── Home.tsx              # Main page, scroll logic, KineticOverlay, NarrativeCarousel
├── components/
│   ├── ParticleScene.tsx     # WebGL engine — particles, Earth model, hover/click picking
│   ├── SpaceView3D.tsx       # Full-screen 3D space explorer overlay
│   └── AsteroidDetail.tsx    # Asteroid impact analysis full-screen page
├── utils/
│   ├── nasaApi.ts            # fetchNasaData(startDate?), NeoAsteroid interface
│   └── particleMath.ts       # Target position generators (Earth, swarm, scatter plot)
├── index.css                 # Tailwind + custom glass classes + font
public/
└── earth-color.jpg           # NASA Blue Marble satellite texture (required)
```

---

## 12. `ParticleScene` Prop API

```typescript
interface ParticleSceneProps {
  onHover?:          (info: HoverInfo | null) => void;
  onClickAsteroid?:  (asteroid: NeoAsteroid) => void;
  nasaData?:         NeoAsteroid[];   // triggers buffer hot-swap on change
  clickEnabled?:     boolean;         // gates asteroid click (false when overlay open)
}
```

---

## 13. `fetchNasaData` API

```typescript
fetchNasaData(startDate?: string): Promise<NeoAsteroid[]>
// ISO 'YYYY-MM-DD'. Fetches date + 7 days. Defaults to today. Falls back to mock data.
```

---

## 14. Completed Features Checklist

- [x] WebGL Foundation & 3D particle system (Vanilla Three.js, no RFiber)
- [x] Math engine & target position generation
- [x] Scroll-telling narrative (Earth → Swarm → Threat Matrix)
- [x] GPU shader morphing (`uProgress`, `aDataFlag`, `aMatrix`)
- [x] Ghost Raycaster fix (aMatrix NDC projection loop)
- [x] High-res UV-sampled Earth (satellite texture, comets)
- [x] Live NASA NeoWs integration + mock fallback
- [x] Temporal Timeline (presets + custom date picker)
- [x] Buffer hot-swap (no scene rebuild on date change)
- [x] Kinetic Impact Overlay (KE physics, comparison bars, glossary)
- [x] Object classification system (7 tiers)
- [x] Glassmorphism design system (liquid-glass + liquid-glass-strong)
- [x] NarrativeCarousel (infinite wrap, crossfade)
- [x] Threat Consensus + Defense Mechanisms panels
- [x] 3D Space View (SpaceView3D.tsx) — full-screen explorer
- [x] Realistic asteroid positions (ecliptic-biased, stable name hash)
- [x] Solid textured Earth in 3D Space View (continent rendering)
- [x] AsteroidDetail full-screen impact page (from 3D Space View clicks)
- [x] Earth fades in only after graph fully formed (p > 0.8 threshold)
- [x] Static particles during scroll phase (no accidental drag)
