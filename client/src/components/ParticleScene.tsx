import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { generateEarth, generateSwarm, generateMatrix, PARTICLE_COUNT } from '../utils/particleMath';
import { fetchNasaData, NeoAsteroid } from '../utils/nasaApi';

// --- Canvas-based 3D Sprite helper (no CSS2DRenderer needed) ---
function createTextSprite(message: string, color = 'rgba(255, 80, 20, 0.9)') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8, 2, 1);
  return { sprite, material: mat };
}

export interface HoverInfo {
  data: NeoAsteroid;
  x: number;
  y: number;
}

interface ParticleSceneProps {
  onHover?: (info: HoverInfo | null) => void;
}

export const ParticleScene: React.FC<ParticleSceneProps> = ({ onHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Mutable ref for NASA data (populated async)
    let nasaData: NeoAsteroid[] = [];

    // 1. Scene Setup (Charcoal Black Theme)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0505');
    scene.fog = new THREE.FogExp2('#0a0505', 0.03);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 2. Background Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(5000 * 3);
    for(let i=0; i < 5000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 150;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffaaaa, size: 0.2, transparent: true, opacity: 0.5 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 3. Generate Data States (Matrix starts as mock, updated async with real NASA data)
    const swarm = generateSwarm();
    const matrix = generateMatrix(); // Initial mock — will be replaced when NASA data arrives

    // Temporary placeholder arrays so the scene doesn't crash before the image loads
    const tempEarthPos = new Float32Array(PARTICLE_COUNT * 3);
    const tempEarthCol = new Float32Array(PARTICLE_COUNT * 3);
    const tempIsThreat = new Float32Array(PARTICLE_COUNT);

    // 4. Buffer Geometry Attributes Initialization
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(tempEarthPos, 3)); // State 0
    geometry.setAttribute('aSwarm', new THREE.BufferAttribute(swarm.positions, 3));   // State 1
    geometry.setAttribute('aMatrix', new THREE.BufferAttribute(matrix.positions, 3)); // State 2
    
    geometry.setAttribute('aColorEarth', new THREE.BufferAttribute(tempEarthCol, 3));
    geometry.setAttribute('aColorSwarm', new THREE.BufferAttribute(swarm.colors, 3));
    geometry.setAttribute('aColorMatrix', new THREE.BufferAttribute(matrix.colors, 3));
    geometry.setAttribute('aIsThreat', new THREE.BufferAttribute(tempIsThreat, 1));
    geometry.setAttribute('aDataFlag', new THREE.BufferAttribute(matrix.dataFlags, 1)); // 1.0=real, 0.0=filler

    // Asynchronously load the accurate Earth map and update the GPU
    generateEarth().then((earthData) => {
      geometry.setAttribute('position', new THREE.BufferAttribute(earthData.positions, 3));
      geometry.setAttribute('aColorEarth', new THREE.BufferAttribute(earthData.colors, 3));
      geometry.setAttribute('aIsThreat', new THREE.BufferAttribute(earthData.isThreat, 1));
    });

    // Asynchronously fetch real NASA data and hot-swap the matrix buffers
    fetchNasaData().then((nasaAsteroids) => {
      console.log(`[ParticleScene] Rebuilding matrix with ${nasaAsteroids.length} real NASA asteroids`);
      nasaData = nasaAsteroids; // Store for raycaster lookup
      const realMatrix = generateMatrix(nasaAsteroids);
      geometry.setAttribute('aMatrix', new THREE.BufferAttribute(realMatrix.positions, 3));
      geometry.setAttribute('aColorMatrix', new THREE.BufferAttribute(realMatrix.colors, 3));
      geometry.setAttribute('aDataFlag', new THREE.BufferAttribute(realMatrix.dataFlags, 1));
    });

    // 5. Custom GLSL Shader Material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 }, // 0=Earth, 1=Swarm, 2=Matrix
        uTime: { value: 0.0 },
        uMouse: { value: new THREE.Vector3(999, 999, 999) }
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
        attribute float aDataFlag; // 1.0 = real NASA data, 0.0 = filler particle
        
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec3 currentPos;
          vec3 currentColor;
          float alpha = 1.0;
          
          if (uProgress < 1.0) {
            currentPos = mix(position, aSwarm, uProgress);
            currentColor = mix(aColorEarth, aColorSwarm, uProgress);
            
            // Minimalist Gravitational Comet Strikes
            if (uProgress < 0.1 && aIsThreat > 0.5) {
                float randomOffset = fract(aIsThreat);
                float cycle = fract(uTime * 0.3 + randomOffset);
                float easeIn = cycle * cycle * cycle * cycle; 
                float currentRadius = length(currentPos);
                float targetScale = 6.4 / currentRadius;
                currentPos *= mix(1.0, targetScale, easeIn);
                currentColor += vec3(easeIn * 0.5); 
            }

          } else {
            float t = clamp(uProgress - 1.0, 0.0, 1.0);
            currentPos = mix(aSwarm, aMatrix, t);
            currentColor = mix(aColorSwarm, aColorMatrix, t);

            // Fade out filler particles as we approach the matrix state
            if (aDataFlag < 0.5 && t > 0.3) {
              float fadeOut = 1.0 - smoothstep(0.3, 0.8, t);
              alpha = fadeOut;
            }
          }

          // Fluid Mouse Repel
          float dist = distance(currentPos, uMouse);
          if (dist < 3.5) {
            vec3 dir = normalize(currentPos - uMouse);
            float force = smoothstep(3.5, 0.0, dist);
            currentPos += dir * force * 1.5;
            currentPos += vec3(-dir.y, dir.x, 0.0) * force * 0.8;
          }

          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
          
          // Base size for Earth/Swarm/Matrix particles
          float baseSize = 80.0; 
          
          // If it is a comet AND we are on the landing page, make it massive
          if (aIsThreat > 0.5 && uProgress < 0.1) {
              baseSize = 250.0;
          }

          // In the matrix state, make real data points larger and more visible
          float t2 = clamp(uProgress - 1.0, 0.0, 1.0);
          if (t2 > 0.5 && aDataFlag > 0.5) {
              baseSize = 180.0; // Real NASA asteroids are prominent
          }

          // Filler particles shrink to nothing when fully in the matrix state
          if (t2 > 0.8 && aDataFlag < 0.5) {
              baseSize = 0.0;
          }

          gl_PointSize = max((baseSize / -mvPosition.z), 0.0); 
          gl_Position = projectionMatrix * mvPosition;
          vColor = currentColor;
          vAlpha = alpha;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if(dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, dist);
          gl_FragColor = vec4(vColor, alpha * 0.9 * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 6. Grid + Axis Labels (fade in at matrix state)
    // Build a wireframe grid in the XY plane (matching the scatter plot data space)
    const gridGroup = new THREE.Group();

    const gridMat = new THREE.LineBasicMaterial({ color: 0x1a0808, transparent: true, opacity: 0 });

    // Vertical lines (X axis divisions: -10 to 10, step 4)
    for (let x = -10; x <= 10; x += 4) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -5, -0.5),
        new THREE.Vector3(x, 5, -0.5),
      ]);
      gridGroup.add(new THREE.Line(geo, gridMat));
    }
    // Horizontal lines (Y axis divisions: -5 to 5, step 2)
    for (let y = -5; y <= 5; y += 2) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, y, -0.5),
        new THREE.Vector3(10, y, -0.5),
      ]);
      gridGroup.add(new THREE.Line(geo, gridMat));
    }
    scene.add(gridGroup);

    // --- The Danger Quadrant "Warning Mat" ---
    // A flat, glowing red footprint on the grid marking the empty close+massive zone
    const warningMatGeo = new THREE.PlaneGeometry(8, 6);
    const warningMatMaterial = new THREE.MeshBasicMaterial({
      color: 0xff1100,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const warningMat = new THREE.Mesh(warningMatGeo, warningMatMaterial);
    warningMat.position.set(-6, 2, -0.4); // top-left quadrant of the data space
    scene.add(warningMat);

    // Build axis label sprites
    const axisGroup = new THREE.Group();

    // X-Axis labels along the bottom
    const xLabels = [
      { text: '1 Lunar Dist.', x: -8 },
      { text: '10 Lunar Dist.', x: -1 },
      { text: '50M km', x: 7 },
    ];
    // Y-Axis labels along the left side
    const yLabels = [
      { text: '50m (House)', y: -3 },
      { text: '150m (Stadium)', y: 0.5 },
      { text: '1km (Extinction)', y: 4 },
    ];

    const allSprites: { material: THREE.SpriteMaterial }[] = [];

    for (const l of xLabels) {
      const { sprite, material: m } = createTextSprite(l.text);
      sprite.position.set(l.x, -6.2, 0);
      sprite.scale.set(6, 1.5, 1);
      axisGroup.add(sprite);
      allSprites.push({ material: m });
    }
    for (const l of yLabels) {
      const { sprite, material: m } = createTextSprite(l.text, 'rgba(255, 120, 40, 0.85)');
      sprite.position.set(-12, l.y, 0);
      sprite.scale.set(7, 1.8, 1);
      axisGroup.add(sprite);
      allSprites.push({ material: m });
    }

    // Danger quadrant label
    const { sprite: dangerLabel, material: dangerLabelMat } = createTextSprite('EMPTY DANGER ZONE', 'rgba(255, 40, 0, 0.9)');
    dangerLabel.position.set(-6, 5.5, 0);
    dangerLabel.scale.set(9, 2, 1);
    axisGroup.add(dangerLabel);
    allSprites.push({ material: dangerLabelMat });

    scene.add(axisGroup);

    // 7. Interactive Raycaster Logic
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 0.5; // generous hitbox for tiny points
    const mouse = new THREE.Vector2();
    const mathPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Mouse repel (always active)
      const planeTarget = new THREE.Vector3();
      const planeHit = raycaster.ray.intersectPlane(mathPlane, planeTarget);
      if (planeHit) {
        material.uniforms.uMouse.value.copy(planeTarget);
      }

      // Raycaster HUD — only when graph is fully formed
      if (material.uniforms.uProgress.value < 1.8 || nasaData.length === 0) {
        if (onHover) onHover(null);
        document.body.style.cursor = 'default';
        return;
      }

      const intersects = raycaster.intersectObject(particles);
      // Only care about real NASA data (index < nasaData.length)
      const validHit = intersects.find(hit => hit.index !== undefined && hit.index < nasaData.length);

      if (validHit && validHit.index !== undefined) {
        document.body.style.cursor = 'crosshair';
        if (onHover) onHover({ data: nasaData[validHit.index], x: e.clientX, y: e.clientY });
      } else {
        document.body.style.cursor = 'default';
        if (onHover) onHover(null);
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    // 8. Native Scroll Engine — progress based on the 300vh scroll container only
    const handleScroll = () => {
      const scrollZoneHeight = window.innerHeight * 3; // 300vh in pixels
      const scrollFraction = Math.max(0, Math.min(1, window.scrollY / (scrollZoneHeight - window.innerHeight)));
      material.uniforms.uProgress.value = scrollFraction * 2.0;

      if (scrollFraction > 0.5) {
         const matrixPhase = (scrollFraction - 0.5) * 2.0;
         gsap.to(particles.rotation, { y: matrixPhase * 0.5, x: matrixPhase * 0.2, duration: 0.5 });

         // Sync grid, warning mat, and axis labels with matrix morph
         const gridOpacity = Math.min(1, (matrixPhase - 0.2) * 2.5);
         const gridTarget = Math.max(0, gridOpacity);
         gsap.to(gridMat, { opacity: gridTarget * 0.4, duration: 0.4 });
         gsap.to(warningMatMaterial, { opacity: gridTarget * 0.12, duration: 0.5 }); // subtle red glow
         for (const s of allSprites) {
           gsap.to(s.material, { opacity: gridTarget * 0.9, duration: 0.5 });
         }

         // Rotate everything to follow the particles
         gsap.to(axisGroup.rotation, { y: matrixPhase * 0.5, x: matrixPhase * 0.2, duration: 0.5 });
         gsap.to(gridGroup.rotation, { y: matrixPhase * 0.5, x: matrixPhase * 0.2, duration: 0.5 });
         gsap.to(warningMat.rotation, { y: matrixPhase * 0.5, x: matrixPhase * 0.2, duration: 0.5 });
      } else {
         gsap.to(particles.rotation, { y: scrollFraction * Math.PI, x: 0, duration: 0.5 });
         // Fade out grid when scrolling back up
         gsap.to(gridMat, { opacity: 0, duration: 0.3 });
         gsap.to(warningMatMaterial, { opacity: 0, duration: 0.3 });
         for (const s of allSprites) {
           gsap.to(s.material, { opacity: 0, duration: 0.3 });
         }
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
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationId);
      document.body.style.cursor = 'default';
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [onHover]);

  return <div ref={containerRef} className="fixed inset-0 w-full h-full z-0" style={{ pointerEvents: 'none' }} />;
};
