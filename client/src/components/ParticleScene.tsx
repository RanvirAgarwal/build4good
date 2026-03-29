import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { generateEarth, generateSwarm, generateMatrix, PARTICLE_COUNT } from '../utils/particleMath';
import { fetchNasaData, NeoAsteroid } from '../utils/nasaApi';

export interface HoverInfo {
  data: NeoAsteroid;
  x: number;
  y: number;
}

interface ParticleSceneProps {
  /** Called when the user hovers an asteroid in the graph state */
  onHover?: (info: HoverInfo | null) => void;
  /** Called when the user clicks an asteroid in the graph state */
  onClickAsteroid?: (asteroid: NeoAsteroid) => void;
  /** External NASA data — when changed, hot-swaps the GPU buffer */
  nasaData?: NeoAsteroid[];
  /** Set to false to disable click detection (e.g. when an overlay is open) */
  clickEnabled?: boolean;
}

export const ParticleScene: React.FC<ParticleSceneProps> = ({ onHover, onClickAsteroid, nasaData: externalNasaData, clickEnabled = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Refs shared between the scene useEffect and the buffer-update useEffect
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  // Internal nasaData mirror — updated by either internal fetch or external prop
  const nasaDataRef = useRef<NeoAsteroid[]>([]);
  // Mutable ref so the stale-closure click handler can read current value
  const clickEnabledRef = useRef(clickEnabled);
  useEffect(() => { clickEnabledRef.current = clickEnabled; }, [clickEnabled]);

  // ── Effect 1: Build the Three.js scene once ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0505');
    scene.fog = new THREE.FogExp2('#0a0505', 0.03);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 2. Background Stars — circular texture
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 150;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 32; starCanvas.height = 32;
    const starCtx = starCanvas.getContext('2d')!;
    starCtx.beginPath();
    starCtx.arc(16, 16, 16, 0, Math.PI * 2);
    starCtx.fillStyle = '#ffffff';
    starCtx.fill();
    const starTexture = new THREE.CanvasTexture(starCanvas);
    const starMat = new THREE.PointsMaterial({
      color: 0xffaaaa, size: 0.15, transparent: true, opacity: 0.6,
      map: starTexture, alphaTest: 0.1, depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 3. Generate Data States
    const swarm = generateSwarm();
    const matrix = generateMatrix();

    const tempEarthPos = new Float32Array(PARTICLE_COUNT * 3);
    const tempEarthCol = new Float32Array(PARTICLE_COUNT * 3);
    const tempIsThreat = new Float32Array(PARTICLE_COUNT);

    // 4. Buffer Geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',     new THREE.BufferAttribute(tempEarthPos, 3));
    geometry.setAttribute('aSwarm',       new THREE.BufferAttribute(swarm.positions, 3));
    geometry.setAttribute('aMatrix',      new THREE.BufferAttribute(matrix.positions, 3));
    geometry.setAttribute('aColorEarth',  new THREE.BufferAttribute(tempEarthCol, 3));
    geometry.setAttribute('aColorSwarm',  new THREE.BufferAttribute(swarm.colors, 3));
    geometry.setAttribute('aColorMatrix', new THREE.BufferAttribute(matrix.colors, 3));
    geometry.setAttribute('aIsThreat',    new THREE.BufferAttribute(tempIsThreat, 1));
    geometry.setAttribute('aDataFlag',    new THREE.BufferAttribute(matrix.dataFlags, 1));
    geometryRef.current = geometry;

    // Async: load Earth map
    generateEarth().then((earthData) => {
      geometry.setAttribute('position',    new THREE.BufferAttribute(earthData.positions, 3));
      geometry.setAttribute('aColorEarth', new THREE.BufferAttribute(earthData.colors, 3));
      geometry.setAttribute('aIsThreat',   new THREE.BufferAttribute(earthData.isThreat, 1));
    });

    // Async: fetch current-week NASA data (initial load — will be replaced by externalNasaData if set)
    fetchNasaData().then((nasaAsteroids) => {
      console.log(`[ParticleScene] Initial load: ${nasaAsteroids.length} asteroids`);
      // Only apply if external data hasn't overridden yet
      if (nasaDataRef.current.length === 0) {
        nasaDataRef.current = nasaAsteroids;
        const realMatrix = generateMatrix(nasaAsteroids);
        geometry.setAttribute('aMatrix',      new THREE.BufferAttribute(realMatrix.positions, 3));
        geometry.setAttribute('aColorMatrix', new THREE.BufferAttribute(realMatrix.colors, 3));
        geometry.setAttribute('aDataFlag',    new THREE.BufferAttribute(realMatrix.dataFlags, 1));
      }
    });

    // 5. Shader Material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uTime:     { value: 0.0 },
        uMouse:    { value: new THREE.Vector3(999, 999, 999) },
      },
      vertexShader: `
        uniform float uProgress;
        uniform float uTime;
        uniform vec3 uMouse;
        attribute vec3 aSwarm;
        attribute vec3 aMatrix;
        attribute vec3 aColorEarth;
        attribute vec3 aColorSwarm;
        attribute vec3 aColorMatrix;
        attribute float aIsThreat;
        attribute float aDataFlag;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec3 currentPos;
          vec3 currentColor;
          float alpha = 1.0;

          if (uProgress < 1.0) {
            currentPos   = mix(position, aSwarm, uProgress);
            currentColor = mix(aColorEarth, aColorSwarm, uProgress);
            if (uProgress < 0.1 && aIsThreat > 0.5) {
              float randomOffset = fract(aIsThreat);
              float cycle  = fract(uTime * 0.3 + randomOffset);
              float easeIn = cycle * cycle * cycle * cycle;
              float currentRadius = length(currentPos);
              float targetScale   = 6.4 / currentRadius;
              currentPos   *= mix(1.0, targetScale, easeIn);
              currentColor += vec3(easeIn * 0.5);
            }
          } else {
            float t      = clamp(uProgress - 1.0, 0.0, 1.0);
            currentPos   = mix(aSwarm, aMatrix, t);
            currentColor = mix(aColorSwarm, aColorMatrix, t);
            if (aDataFlag < 0.5 && t > 0.3) {
              alpha = 1.0 - smoothstep(0.3, 0.8, t);
            }
          }

          // Mouse repel only before graph phase
          if (uProgress < 1.5) {
            float dist = distance(currentPos, uMouse);
            if (dist < 3.5) {
              vec3 dir   = normalize(currentPos - uMouse);
              float force = smoothstep(3.5, 0.0, dist);
              currentPos += dir * force * 1.5;
              currentPos += vec3(-dir.y, dir.x, 0.0) * force * 0.8;
            }
          }

          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);

          float baseSize = 80.0;
          if (aIsThreat > 0.5 && uProgress < 0.1) {
            baseSize = 250.0;
          } else if (uProgress > 1.5 && aDataFlag > 0.5) {
            baseSize = 400.0;
          }
          float t2 = clamp(uProgress - 1.0, 0.0, 1.0);
          if (t2 > 0.8 && aDataFlag < 0.5) baseSize = 0.0;

          gl_PointSize = max((baseSize / -mvPosition.z), 0.0);
          gl_Position  = projectionMatrix * mvPosition;
          vColor = currentColor;
          vAlpha = alpha;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, dist);
          gl_FragColor = vec4(vColor, alpha * 0.9 * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // 6. Grid (XY plane)
    const gridGroup = new THREE.Group();
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1a0808, transparent: true, opacity: 0 });
    for (let x = -10; x <= 10; x += 4) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -5, -0.5), new THREE.Vector3(x, 5, -0.5),
      ]);
      gridGroup.add(new THREE.Line(geo, gridMat));
    }
    for (let y = -5; y <= 5; y += 2) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, y, -0.5), new THREE.Vector3(10, y, -0.5),
      ]);
      gridGroup.add(new THREE.Line(geo, gridMat));
    }
    scene.add(gridGroup);

    // 7. Custom aMatrix Projection (bypasses Ghost Raycaster bug)
    const mouse    = new THREE.Vector2();
    const tempV    = new THREE.Vector3();
    const mathPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const mathRay  = new THREE.Ray();

    /** Project aMatrix[i] through the particle group's current world matrix → NDC */
    function projectPoint(i: number): THREE.Vector3 {
      tempV.fromBufferAttribute(geometry.attributes.aMatrix as THREE.BufferAttribute, i);
      tempV.applyMatrix4(particles.matrixWorld);
      tempV.project(camera);
      return tempV;
    }

    /** Find the closest real NASA asteroid to a given NDC mouse position */
    function findClosestAsteroid(mx: number, my: number, threshold: number): NeoAsteroid | null {
      const data = nasaDataRef.current;
      if (data.length === 0 || material.uniforms.uProgress.value < 1.8) return null;
      let closest: NeoAsteroid | null = null;
      let minDist = threshold;
      for (let i = 0; i < data.length; i++) {
        const p = projectPoint(i);
        const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
        if (dist < minDist) { minDist = dist; closest = data[i]; }
      }
      return closest;
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Mouse repel: project ray to math plane → update shader uniform
      mathRay.origin.setFromMatrixPosition(camera.matrixWorld);
      mathRay.direction.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(mathRay.origin).normalize();
      const planeTarget = new THREE.Vector3();
      if (mathRay.intersectPlane(mathPlane, planeTarget)) {
        material.uniforms.uMouse.value.copy(planeTarget);
      }

      // Hover detection
      if (material.uniforms.uProgress.value < 1.8 || nasaDataRef.current.length === 0) {
        if (onHover) onHover(null);
        document.body.style.cursor = 'default';
        return;
      }
      const hit = findClosestAsteroid(mouse.x, mouse.y, 0.04);
      if (hit) {
        document.body.style.cursor = 'crosshair';
        if (onHover) onHover({ data: hit, x: e.clientX, y: e.clientY });
      } else {
        document.body.style.cursor = 'default';
        if (onHover) onHover(null);
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!clickEnabledRef.current) return;
      if (material.uniforms.uProgress.value < 1.8 || nasaDataRef.current.length === 0) return;
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 + 1;
      const hit = findClosestAsteroid(mx, my, 0.05);
      if (hit && onClickAsteroid) onClickAsteroid(hit);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    // 8. Native Scroll Engine — 300vh zone
    const handleScroll = () => {
      const scrollZoneHeight = window.innerHeight * 3;
      const scrollFraction = Math.max(0, Math.min(1, window.scrollY / (scrollZoneHeight - window.innerHeight)));
      material.uniforms.uProgress.value = scrollFraction * 2.0;

      if (scrollFraction > 0.5) {
        const p = (scrollFraction - 0.5) * 2.0;
        gsap.to(particles.rotation, { y: p * 0.5, x: p * 0.2, duration: 0.5 });
        const gridTarget = Math.max(0, Math.min(1, (p - 0.2) * 2.5));
        gsap.to(gridMat, { opacity: gridTarget * 0.4, duration: 0.4 });
        gsap.to(gridGroup.rotation, { y: p * 0.5, x: p * 0.2, duration: 0.5 });
      } else {
        gsap.to(particles.rotation, { y: scrollFraction * Math.PI, x: 0, duration: 0.5 });
        gsap.to(gridMat, { opacity: 0, duration: 0.3 });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // 9. Render Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      material.uniforms.uTime.value += 0.01;
      stars.rotation.y += 0.0003;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationId);
      document.body.style.cursor = 'default';
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []); // Scene built once — never re-runs

  // ── Effect 2: Hot-swap GPU buffers when external NASA data changes ────────
  useEffect(() => {
    if (!externalNasaData || externalNasaData.length === 0) return;
    const geo = geometryRef.current;
    const pts = particlesRef.current;
    if (!geo || !pts) return;

    console.log(`[ParticleScene] Hot-swapping buffer: ${externalNasaData.length} asteroids`);
    nasaDataRef.current = externalNasaData;

    const newMatrix = generateMatrix(externalNasaData);
    geo.setAttribute('aMatrix',      new THREE.BufferAttribute(newMatrix.positions, 3));
    geo.setAttribute('aColorMatrix', new THREE.BufferAttribute(newMatrix.colors, 3));
    geo.setAttribute('aDataFlag',    new THREE.BufferAttribute(newMatrix.dataFlags, 1));
    (geo.attributes.aMatrix as THREE.BufferAttribute).needsUpdate      = true;
    (geo.attributes.aColorMatrix as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aDataFlag as THREE.BufferAttribute).needsUpdate    = true;

    // Pulse the particle cloud to signal data refresh
    gsap.fromTo(
      pts.scale,
      { x: 0.88, y: 0.88, z: 0.88 },
      { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.7)' }
    );
  }, [externalNasaData]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
};
