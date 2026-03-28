import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { generateEarth, generateSwarm, generateMatrix, PARTICLE_COUNT } from '../utils/particleMath';
import { fetchNasaData } from '../utils/nasaApi';

export const ParticleScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
            // When t > 0.5 and this is a filler particle, start fading it
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

    // 6. Interactive Raycaster Logic (mathematical plane only — no visible geometry)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      const intersects = raycaster.ray.intersectPlane(plane, target);
      if (intersects) {
        material.uniforms.uMouse.value.copy(target);
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    // 7. Native Scroll Engine (bulletproof — bypasses all React/GSAP conflicts)
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return; 
      
      const scrollFraction = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      material.uniforms.uProgress.value = scrollFraction * 2.0;

      if (scrollFraction > 0.5) {
         const matrixPhase = (scrollFraction - 0.5) * 2.0;
         gsap.to(particles.rotation, { y: matrixPhase * 0.5, x: matrixPhase * 0.2, duration: 0.5 });
      } else {
         gsap.to(particles.rotation, { y: scrollFraction * Math.PI, x: 0, duration: 0.5 });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // 8. Render Loop
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
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 w-full h-full z-0" style={{ pointerEvents: 'none' }} />;
};
