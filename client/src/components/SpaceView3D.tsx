import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { fetchNasaData, NeoAsteroid } from '../utils/nasaApi';
import { AsteroidDetail } from './AsteroidDetail';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCircleTex(size = 32): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.85)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/** Stable deterministic hash from a string → 0..1 */
function strHash(s: string, salt = 0): number {
  let h = salt * 2654435761;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return (h >>> 0) / 0xffffffff;
}

/**
 * Build asteroid positions using realistic orbital distribution.
 * - Azimuth  (θ) is seeded from the asteroid name  → random-looking, stable
 * - Elevation (φ) is biased toward the ecliptic plane (±30° spread) as NEOs really are
 * - Radius   is log-scaled from true miss-distance in Lunar Distances
 */
function buildAsteroidBuffers(data: NeoAsteroid[]): { pos: Float32Array; col: Float32Array } {
  const N   = data.length;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);

  data.forEach((neo, i) => {
    const ld     = neo.missDistanceKm / 384400;
    // Log-scale distance: 1 LD→3.8 u, 100 LD→~36 u, 500 LD→~55 u
    const r      = 3.8 + (Math.log10(Math.max(ld, 0.1) + 1) / Math.log10(601)) * 60;

    // Stable pseudo-random angles from asteroid name hash
    const theta  = strHash(neo.name, 0) * Math.PI * 2;
    // Ecliptic-biased inclination: ±30° from ecliptic (realistic for NEO population)
    const inclin = (strHash(neo.name, 1) - 0.5) * Math.PI * (60 / 180);
    const phi    = Math.PI / 2 + inclin; // 60°–120° zenith = ±30° from equatorial plane

    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    if (neo.isPotentiallyHazardous) {
      col[i * 3] = 1.0; col[i * 3 + 1] = 0.12; col[i * 3 + 2] = 0.04;
    } else {
      const t = Math.min(1, Math.log10(Math.max(neo.estimatedDiameterKm * 1000, 1)) / 3.2);
      col[i * 3] = 0.85 + t * 0.15; col[i * 3 + 1] = 0.28 + t * 0.4; col[i * 3 + 2] = 0.05;
    }
  });
  return { pos, col };
}

const PRESETS = [
  { key: 'current', label: 'Now',  days:  0 },
  { key: '-14d',    label: '−14d', days: -14 },
  { key: '-7d',     label: '−7d',  days:  -7 },
  { key: '+7d',     label: '+7d',  days:   7 },
  { key: '+14d',    label: '+14d', days:  14 },
];

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props { nasaData: NeoAsteroid[]; onClose: () => void; }

export function SpaceView3D({ nasaData, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const astGeoRef    = useRef<THREE.BufferGeometry | null>(null);
  const astMeshRef   = useRef<THREE.Points | null>(null);
  const localDataRef = useRef<NeoAsteroid[]>(nasaData);

  const [localData,    setLocalData]    = useState<NeoAsteroid[]>(nasaData);
  const [hovered,      setHovered]      = useState<{ data: NeoAsteroid; x: number; y: number } | null>(null);
  const [detailAst,    setDetailAst]    = useState<NeoAsteroid | null>(null);
  const [activePreset, setActivePreset] = useState('current');
  const [loading,      setLoading]      = useState(false);
  const [customDate,   setCustomDate]   = useState('');

  // ── Hot-swap asteroid buffer when localData changes ──────────────────────
  useEffect(() => {
    localDataRef.current = localData;
    const geo = astGeoRef.current;
    if (!geo) return;
    const { pos, col } = buildAsteroidBuffers(localData);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    geo.setDrawRange(0, localData.length);
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color    as THREE.BufferAttribute).needsUpdate = true;
    setHovered(null);
  }, [localData]);

  // ── Timeline fetch ───────────────────────────────────────────────────────
  const fetchPreset = useCallback(async (preset: typeof PRESETS[0]) => {
    setLoading(true); setDetailAst(null);
    try {
      const data = await fetchNasaData(preset.days === 0 ? undefined : offsetDate(preset.days));
      setLocalData(data); setActivePreset(preset.key);
    } catch { /**/ }
    setLoading(false);
  }, []);

  const fetchCustom = useCallback(async (date: string) => {
    if (!date) return;
    setLoading(true); setDetailAst(null);
    try { const data = await fetchNasaData(date); setLocalData(data); setActivePreset('custom'); } catch { /**/ }
    setLoading(false);
  }, []);

  // ── Scene (built once) ───────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030101);
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    let   camR = 22, camTheta = 0.4, camPhi = Math.PI / 3;
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.05, 2000);

    const updateCamera = () => {
      camera.position.set(
        camR * Math.sin(camPhi) * Math.sin(camTheta),
        camR * Math.cos(camPhi),
        camR * Math.sin(camPhi) * Math.cos(camTheta),
      );
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    // Stars
    const sp = new Float32Array(4000 * 3);
    for (let i = 0; i < 4000; i++) {
      const t = Math.random() * Math.PI * 2, p = Math.acos(1 - 2 * Math.random()), r = 600 + Math.random() * 500;
      sp[i * 3] = r * Math.sin(p) * Math.cos(t); sp[i * 3 + 1] = r * Math.sin(p) * Math.sin(t); sp[i * 3 + 2] = r * Math.cos(p);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const starMesh = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 0.9, map: makeCircleTex(16), transparent: true, sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(starMesh);

    // ── Earth: solid textured sphere + UV particle cloud ─────────────────
    const EARTH_R = 2.5;

    // 1) Solid textured base
    const texLoader = new THREE.TextureLoader();
    const earthSolid = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_R * 0.98, 48, 32),
      new THREE.MeshBasicMaterial({ transparent: false }),
    );
    texLoader.load('/earth-color.jpg', (tex) => {
      (earthSolid.material as THREE.MeshBasicMaterial).map = tex;
      (earthSolid.material as THREE.MeshBasicMaterial).needsUpdate = true;
    });
    scene.add(earthSolid);

    // 2) Particle cloud on top (adds depth/sparkle)
    const EARTH_N = 6000;
    const eGeo = new THREE.BufferGeometry();
    const ePos  = new Float32Array(EARTH_N * 3);
    const eCol  = new Float32Array(EARTH_N * 3);
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    eGeo.setAttribute('color',    new THREE.BufferAttribute(eCol, 3));
    const earthCloud = new THREE.Points(eGeo, new THREE.PointsMaterial({
      size: 0.045, vertexColors: true, transparent: true, opacity: 0.55,
      map: makeCircleTex(16), sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(earthCloud);

    const img = new Image();
    img.src = '/earth-color.jpg'; img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width; cvs.height = img.height;
      const ctx = cvs.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
      for (let i = 0; i < EARTH_N; i++) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(1 - 2 * Math.random());
        ePos[i * 3]     = EARTH_R * Math.sin(ph) * Math.cos(th);
        ePos[i * 3 + 1] = EARTH_R * Math.cos(ph);
        ePos[i * 3 + 2] = EARTH_R * Math.sin(ph) * Math.sin(th);
        const u = ((th + Math.PI) / (Math.PI * 2)) % 1, v = ph / Math.PI;
        const px = Math.floor(u * cvs.width), py = Math.floor(v * cvs.height);
        const di = (py * cvs.width + px) * 4;
        eCol[i * 3] = d[di] / 255; eCol[i * 3 + 1] = d[di + 1] / 255; eCol[i * 3 + 2] = d[di + 2] / 255;
      }
      (eGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (eGeo.attributes.color    as THREE.BufferAttribute).needsUpdate = true;
    };

    // Atmosphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_R * 1.06, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x0022cc, transparent: true, opacity: 0.07, side: THREE.BackSide })
    ));

    // Ecliptic plane (subtle ring grid at y=0)
    [5, 10, 20, 40].forEach((ld) => {
      const r2 = 3.8 + (Math.log10(ld + 1) / Math.log10(601)) * 60;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 100; i++) { const t = (i / 100) * Math.PI * 2; pts.push(new THREE.Vector3(r2 * Math.cos(t), 0, r2 * Math.sin(t))); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1a0606, transparent: true, opacity: 0.7 })));
    });

    // ── Asteroids ────────────────────────────────────────────────────────
    const { pos: ap, col: ac } = buildAsteroidBuffers(localDataRef.current);
    const astGeo   = new THREE.BufferGeometry();
    astGeo.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    astGeo.setAttribute('color',    new THREE.BufferAttribute(ac, 3));
    const astMesh  = new THREE.Points(astGeo, new THREE.PointsMaterial({
      size: 0.5, vertexColors: true, transparent: true, opacity: 0.95,
      map: makeCircleTex(32), sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(astMesh);
    astGeoRef.current  = astGeo;
    astMeshRef.current = astMesh;

    // ── Raycaster ────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 0.55;
    const mouse2 = new THREE.Vector2();

    // ── Controls ─────────────────────────────────────────────────────────
    let isDown = false, dragged = false, prevX = 0, prevY = 0;

    const onDown = (e: MouseEvent) => {
      isDown = true; dragged = false;
      prevX = e.clientX; prevY = e.clientY;
      el.style.cursor = 'grabbing';
    };
    const onUp = () => { isDown = false; el.style.cursor = 'grab'; };

    const doHover = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse2.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse2.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse2, camera);
      const hits = raycaster.intersectObject(astMeshRef.current!);
      if (hits.length > 0) {
        setHovered({ data: localDataRef.current[hits[0].index!], x: e.clientX, y: e.clientY });
        el.style.cursor = 'crosshair';
      } else {
        setHovered(null);
        el.style.cursor = isDown ? 'grabbing' : 'grab';
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!isDown) { doHover(e); return; }
      dragged = true;
      const dx = e.clientX - prevX, dy = e.clientY - prevY;
      camTheta -= dx * 0.004;
      camPhi = Math.max(0.08, Math.min(Math.PI - 0.08, camPhi + dy * 0.004));
      updateCamera();
      prevX = e.clientX; prevY = e.clientY;
    };

    const onClick = (e: MouseEvent) => {
      if (dragged) return;
      const rect = el.getBoundingClientRect();
      mouse2.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse2.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse2, camera);
      const hits = raycaster.intersectObject(astMeshRef.current!);
      if (hits.length > 0) {
        setDetailAst(localDataRef.current[hits[0].index!]);
      }
    };

    const onWheel = (e: WheelEvent) => {
      camR = Math.max(4, Math.min(200, camR + e.deltaY * 0.05));
      updateCamera();
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup',   onUp);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('click',     onClick);
    el.addEventListener('wheel',     onWheel, { passive: true });

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDetailAst(null); onClose(); }
    };
    window.addEventListener('keydown', onKey);

    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      earthSolid.rotation.y += 0.0012;
      earthCloud.rotation.y += 0.0012;
      starMesh.rotation.y   += 0.00008;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup',   onUp);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('click',     onClick);
      el.removeEventListener('wheel',     onWheel);
      window.removeEventListener('resize',  onResize);
      window.removeEventListener('keydown', onKey);
      astGeoRef.current  = null;
      astMeshRef.current = null;
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden" style={{ fontFamily: "'Satoshi-Variable', sans-serif", background: '#030101' }}>
      {/* Three.js canvas — always mounted */}
      <div ref={containerRef} className="absolute inset-0" style={{ cursor: 'grab' }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, rgba(3,1,1,0.78) 0%, transparent 100%)' }}>
        <div>
          <div className="text-white font-bold" style={{ fontSize: '1.05rem', letterSpacing: '-0.015em' }}>3D Space View</div>
          <div className="font-mono text-[10px] tracking-widest uppercase mt-0.5" style={{ color: 'rgba(251,146,60,0.55)' }}>
            {loading ? 'Fetching data…' : `${localData.length} objects · drag to orbit · click to inspect`}
          </div>
        </div>
        <button onClick={onClose} className="liquid-glass rounded-full px-5 py-2 text-white/60 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors pointer-events-auto">
          ← Close
        </button>
      </div>

      {/* Timeline bar */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4 z-10 pointer-events-auto">
        <div className="liquid-glass rounded-full px-2 py-2 flex flex-wrap justify-center gap-1 items-center max-w-2xl">
          <span className="text-white/20 text-[10px] font-mono uppercase tracking-widest px-3 hidden md:block">Timeline</span>
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => fetchPreset(p)} disabled={loading}
              className="rounded-full px-4 py-1.5 text-[11px] font-mono uppercase tracking-widest transition-all"
              style={{
                background: activePreset === p.key ? 'rgba(251,146,60,0.18)' : 'transparent',
                color:      activePreset === p.key ? '#fb923c' : 'rgba(255,255,255,0.35)',
                border:     activePreset === p.key ? '1px solid rgba(251,146,60,0.3)' : '1px solid transparent',
              }}>
              {p.label}
            </button>
          ))}
          <div className="w-px h-5 bg-white/10 mx-1 hidden md:block" />
          <input type="date" value={customDate}
            onChange={(e) => { setCustomDate(e.target.value); fetchCustom(e.target.value); }}
            onWheel={(e) => e.stopPropagation()}
            className="rounded-full px-3 py-1.5 text-[11px] font-mono text-white/50 bg-transparent border border-white/10 focus:outline-none focus:border-orange-500/30"
            style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-20 left-6 z-10 liquid-glass rounded-2xl p-4 pointer-events-none">
        <div className="text-white/15 font-mono text-[9px] uppercase tracking-widest mb-2.5">Legend</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#ff2600' }} /><span className="text-white/35 text-[11px]">Potentially Hazardous</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#fb923c' }} /><span className="text-white/35 text-[11px]">Tracked NEO</span></div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="fixed z-20 pointer-events-none liquid-glass rounded-xl px-4 py-3"
             style={{ left: hovered.x + 14, top: hovered.y + 14, minWidth: 180 }}>
          <div className="text-white/75 font-semibold text-xs leading-snug mb-1">{hovered.data.name}</div>
          <div className="text-white/30 text-[10px]">
            {(hovered.data.missDistanceKm / 384400).toFixed(2)} LD ·{' '}
            {hovered.data.isPotentiallyHazardous ? '⚠ PHO · ' : ''}
            click for details
          </div>
        </div>
      )}
      {/* ── Detail page overlaid on top of 3D scene ── */}
      {detailAst && (
        <div className="absolute inset-0 z-[200]">
          <AsteroidDetail asteroid={detailAst} onBack={() => setDetailAst(null)} />
        </div>
      )}
    </div>
  );
}
