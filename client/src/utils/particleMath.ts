import * as THREE from 'three';

export const PARTICLE_COUNT = 15000;
const EARTH_POINTS = 14850;
const THREAT_POINTS = 150;

// 1. STATE 0: The Earth + The Incoming Comets
export const generateEarth = async (): Promise<{positions: Float32Array, colors: Float32Array, isThreat: Float32Array}> => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const isThreat = new Float32Array(PARTICLE_COUNT); // 0.0 for Earth, 1.0 for Comet
  const R = 6.5;

  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/earth-color.jpg';
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // --- 1. Generate the Earth (First 11,000 points) ---
      for (let i = 0; i < EARTH_POINTS; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - 2 * Math.random());

        positions[i * 3] = R * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = R * Math.cos(phi);
        positions[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);

        let u = (theta + Math.PI) / (Math.PI * 2);
        u = u % 1.0;
        const v = phi / Math.PI;

        const px = Math.floor(u * canvas.width);
        const py = Math.floor(v * canvas.height);
        const idx = (py * canvas.width + px) * 4;

        colors[i * 3] = imgData[idx] / 255.0;
        colors[i * 3 + 1] = imgData[idx + 1] / 255.0;
        colors[i * 3 + 2] = imgData[idx + 2] / 255.0;
        isThreat[i] = 0.0; // It's Earth
      }

      // --- 2. Generate the Incoming Comets (Remaining 150 points) ---
      for (let i = EARTH_POINTS; i < PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - 2 * Math.random());
        
        // Spawn them WAY out in deep space so they have room to fall
        const threatR = 20.0 + Math.random() * 20.0; 

        positions[i * 3] = threatR * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = threatR * Math.cos(phi);
        positions[i * 3 + 2] = threatR * Math.sin(phi) * Math.sin(theta);

        // Bright, burning orange/white colors
        colors[i * 3] = 1.0;                           // R
        colors[i * 3 + 1] = 0.3 + Math.random() * 0.4; // G
        colors[i * 3 + 2] = 0.0;                       // B
        
        // HACK: Pack the threat flag (1.0) AND a random time offset into the same float!
        isThreat[i] = 1.0 + Math.random(); 
      }

      resolve({ positions, colors, isThreat });
    };
    
    // Fallback if image fails to load
    img.onerror = () => {
      console.error("Failed to load earth-color.jpg, falling back to empty arrays.");
      resolve({ positions, colors, isThreat }); 
    };
  });
};

// 2. STATE 1: The Swarm (Chaos)
export const generateSwarm = () => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const R = 9.0; 
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - 2 * Math.random());
    const r = R + (Math.random() - 0.5) * 6.0; 

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    
    colors[i * 3] = 0.8 + Math.random() * 0.2;
    colors[i * 3 + 1] = Math.random() * 0.3;
    colors[i * 3 + 2] = 0.05;
  }
  return { positions, colors };
};

// 3. STATE 2: The Structured 3D Graph
export const generateMatrix = () => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Structured Grid-like spread
    let x = (Math.random() * 20) - 10; // X bounds: -10 to 10
    let y = (Math.random() * 10) - 5;  // Y bounds: -5 to 5
    
    // NARRATIVE FIX: The Danger Quadrant (Top Left) MUST be empty.
    // If it's close (x < -2) and big (y > -1), push it down to the tiny section!
    if (x < -2.0 && y > -1.0) {
        y -= (Math.random() * 3.5 + 1.0); 
    }

    // Flatter Z-axis for a "glass slab" data look, rather than a messy cloud
    let z = (Math.random() - 0.5) * 1.5; 

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Intensity Heatmap: Hotter/Brighter in the Top Right
    const intensity = (y + 5) / 10; 
    colors[i * 3] = 0.8 + (intensity * 0.2); 
    colors[i * 3 + 1] = intensity * 0.6;     
    colors[i * 3 + 2] = 0.1;                
  }
  
  return { positions, colors };
};
