// components/ParticleScene.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { generateMockData, generateSwarm, generateMatrix, generateEarth } from '../utils/particleMath';

interface ParticleSceneProps {
  scrollIndex: number;
}

export const ParticleScene: React.FC<ParticleSceneProps> = ({ scrollIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const currentPosRef = useRef<Float32Array | null>(null);
  const targetPosRef = useRef<Float32Array | null>(null);
  
  const statesRef = useRef({
    swarm: new Float32Array(),
    matrix: new Float32Array(),
    earth: new Float32Array()
  });

  const PARTICLE_COUNT = 4000;

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Three.js
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050a, 0.05);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 2. Create Background Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(10000 * 3);
    for(let i=0; i < 10000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 150;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.4 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 3. Initialize Main Particles & Colors
    const mockData = generateMockData(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    
    for(let i=0; i < PARTICLE_COUNT; i++) {
      if (mockData[i].is_hazardous) {
        // Red/Amber for Hazardous
        colors[i*3] = 1.0; colors[i*3+1] = 0.2; colors[i*3+2] = 0.0;
      } else {
        // Cyan for Safe
        colors[i*3] = 0.0; colors[i*3+1] = 0.8; colors[i*3+2] = 1.0;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create Circle Texture
    const createCircleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (context) {
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      map: createCircleTexture(),
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // 4. Generate Geometries
    statesRef.current.swarm = generateSwarm(PARTICLE_COUNT, 6);
    statesRef.current.matrix = generateMatrix(mockData, PARTICLE_COUNT);
    
    currentPosRef.current = new Float32Array(statesRef.current.swarm);
    targetPosRef.current = statesRef.current.swarm;
    geometry.setAttribute('position', new THREE.BufferAttribute(currentPosRef.current, 3));

    // Async load Earth
    generateEarth(PARTICLE_COUNT).then(earthArray => {
      statesRef.current.earth = earthArray;
    });

    // 5. Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Ambient rotation
      particles.rotation.y += 0.002;
      stars.rotation.y += 0.0005;

      // Lerp particles
      if (currentPosRef.current && targetPosRef.current) {
        let needsUpdate = false;
        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
          const diff = targetPosRef.current[i] - currentPosRef.current[i];
          if (Math.abs(diff) > 0.01) {
            currentPosRef.current[i] += diff * 0.05; // Smoothing factor
            needsUpdate = true;
          }
        }
        if (needsUpdate) {
          geometry.attributes.position.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  // Update target based on scroll
  useEffect(() => {
    if (scrollIndex === 0 && statesRef.current.swarm.length > 0) targetPosRef.current = statesRef.current.swarm;
    else if (scrollIndex === 1 && statesRef.current.matrix.length > 0) targetPosRef.current = statesRef.current.matrix;
    else if (scrollIndex === 2 && statesRef.current.earth.length > 0) targetPosRef.current = statesRef.current.earth;
  }, [scrollIndex]);

  return (
    // strict Z-index enforcement to stay strictly in the background
    <div 
      ref={containerRef} 
      className="fixed inset-0 w-full h-full -z-50 bg-[#05050a] pointer-events-none" 
    />
  );
};
