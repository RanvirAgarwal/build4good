import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { generateEarth, generateSwarm, generateMatrix, PARTICLE_COUNT } from '../utils/particleMath';

gsap.registerPlugin(ScrollTrigger);

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

    // 3. Generate Data States
    const swarm = generateSwarm();
    const matrix = generateMatrix();

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
    geometry.setAttribute('aIsThreat', new THREE.BufferAttribute(tempIsThreat, 1)); // Mark threat for comets

    // Asynchronously load the accurate Earth map and update the GPU
    generateEarth().then((earthData) => {
      geometry.setAttribute('position', new THREE.BufferAttribute(earthData.positions, 3));
      geometry.setAttribute('aColorEarth', new THREE.BufferAttribute(earthData.colors, 3));
      geometry.setAttribute('aIsThreat', new THREE.BufferAttribute(earthData.isThreat, 1));
      
      (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aColorEarth as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aIsThreat as THREE.BufferAttribute).needsUpdate = true;
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
        attribute float aIsThreat; // <-- NEW: Identifies comets vs earth
        
        varying vec3 vColor;

        void main() {
          vec3 currentPos;
          vec3 currentColor;
          
          if (uProgress < 1.0) {
            currentPos = mix(position, aSwarm, uProgress);
            currentColor = mix(aColorEarth, aColorSwarm, uProgress);
            
            // <-- NEW: Cinematic Comet Motion on the Landing Page
            // If we are on State 0 and this particle is a threat, orbit it rapidly
            if (uProgress < 0.1 && aIsThreat > 0.5) {
                float angle = uTime * 2.0 + currentPos.y;
                float radius = length(currentPos.xz);
                currentPos.x = cos(angle) * radius;
                currentPos.z = sin(angle) * radius;
                
                // Add a slight pulse
                currentPos *= 1.0 + sin(uTime * 5.0 + currentPos.x) * 0.02;
            }

          } else {
            currentPos = mix(aSwarm, aMatrix, clamp(uProgress - 1.0, 0.0, 1.0));
            currentColor = mix(aColorSwarm, aColorMatrix, clamp(uProgress - 1.0, 0.0, 1.0));
          }

          // Fluid Mouse Repel
          float dist = distance(currentPos, uMouse);
          if (dist < 3.5) {
            vec3 dir = normalize(currentPos - uMouse);
            float force = smoothstep(3.5, 0.0, dist);
            // Push outward and swirl
            currentPos += dir * force * 1.5;
            currentPos += vec3(-dir.y, dir.x, 0.0) * force * 0.8;
          }

          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
          gl_PointSize = max((110.0 / -mvPosition.z), 1.5); // Smaller points for high-res
          gl_Position = projectionMatrix * mvPosition;
          vColor = currentColor;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if(dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, dist);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 6. Interactive Raycaster Logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z=0 plane

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

    // 7. ScrollTrigger Animation
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
      onUpdate: (self) => {
        // self.progress is 0 to 1. We multiply by 2 so uProgress goes 0 to 2.
        material.uniforms.uProgress.value = self.progress * 2.0;
        
        // Rotate the system slightly during the matrix phase for perspective
        if (self.progress > 0.5) {
           const matrixPhase = (self.progress - 0.5) * 2.0;
           gsap.to(particles.rotation, { y: matrixPhase * 0.5, x: matrixPhase * 0.2, duration: 0.5 });
        } else {
           gsap.to(particles.rotation, { y: self.progress * Math.PI, x: 0, duration: 0.5 });
        }
      }
    });

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
      cancelAnimationFrame(animationId);
      ScrollTrigger.getAll().forEach(t => t.kill());
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none" />;
};
