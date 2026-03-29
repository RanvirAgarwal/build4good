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

    // 2. Background Stars — circular texture so they render as dots, not squares
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(5000 * 3);
    for(let i=0; i < 5000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 150;
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
      color: 0xffaaaa,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      map: starTexture,
      alphaTest: 0.1,
      depthWrite: false,
    });
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

          // Fluid Mouse Repel — ONLY active before the Matrix graph forms.
          // When uProgress >= 1.5 the graph is forming; repel is disabled so the
          // CPU Raycaster and GPU positions match exactly for hover detection.
          if (uProgress < 1.5) {
            float dist = distance(currentPos, uMouse);
            if (dist < 3.5) {
              vec3 dir = normalize(currentPos - uMouse);
              float force = smoothstep(3.5, 0.0, dist);
              currentPos += dir * force * 1.5;
              currentPos += vec3(-dir.y, dir.x, 0.0) * force * 0.8;
            }
          }

          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
          
          // Base size for Earth/Swarm/Matrix particles
          float baseSize = 80.0;

          if (aIsThreat > 0.5 && uProgress < 0.1) {
              baseSize = 250.0; // Landing page comets
          } else if (uProgress > 1.5 && aDataFlag > 0.5) {
              baseSize = 400.0; // LARGE real NASA data points — easy raycaster targets
          }

          // Filler particles shrink to nothing when fully in the matrix state
          float t2 = clamp(uProgress - 1.0, 0.0, 1.0);
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

    // 6. Grid (fade in at matrix state) — XY plane matching scatter plot data space
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

    // 7. Interactive Raycaster Logic
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 2.5; // Large hitbox — points are tiny, this makes them clickable
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

         // Sync grid with matrix morph
         const gridOpacity = Math.min(1, (matrixPhase - 0.2) * 2.5);
         const gridTarget = Math.max(0, gridOpacity);
         gsap.to(gridMat, { opacity: gridTarget * 0.4, duration: 0.4 });
         gsap.to(gridGroup.rotation, { y: matrixPhase * 0.5, x: matrixPhase * 0.2, duration: 0.5 });
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
