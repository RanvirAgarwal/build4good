// utils/particleMath.ts

export interface Asteroid {
  id: number;
  diameter: number;
  miss_distance: number;
  is_hazardous: boolean;
}

// 1. Generate Mock NASA Data
export const generateMockData = (count: number): Asteroid[] => {
  const data: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: i,
      diameter: Math.random() * 5, // 0 to 5 km
      miss_distance: Math.random() * 150000000, // up to 150M km
      is_hazardous: Math.random() > 0.95, // 5% chance
    });
  }
  return data;
};

// 2. STATE 1: The Swarm (Perfect Sphere)
export const generateSwarm = (count: number, radius: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - 2 * Math.random());
    const r = radius + (Math.random() - 0.5) * 1.5; // Volumetric shell

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  return positions;
};

// 3. STATE 2: The Reality Check (Logarithmic 3D Graph)
export const generateMatrix = (data: Asteroid[], count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const item = data[i];
    
    // X-Axis: Distance (Log scale mapped to spread across screen)
    const logDist = Math.log10(item.miss_distance + 1);
    const x = (logDist / 8.5) * 16 - 8; 
    
    // Y-Axis: Size (Log scale mapped vertically)
    const logSize = Math.log10(item.diameter + 1);
    const y = logSize * 6 - 3; 

    // Z-Axis: Depth dispersion
    const z = (Math.random() - 0.5) * 3;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};

// 4. STATE 3: The Earth (Image Sampling)
export const generateEarth = (count: number): Promise<Float32Array> => {
  return new Promise((resolve) => {
    const img = new Image();
    // IMPORTANT: Place a black and white equirectangular map named 'earth-mask.png' in your public folder.
    img.src = '/earth-mask.png'; 
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      const positions = new Float32Array(count * 3);
      let pIdx = 0;
      
      while (pIdx < count * 3) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - 2 * Math.random());
        
        const u = theta / (Math.PI * 2);
        const v = phi / Math.PI;
        
        const px = Math.floor(u * canvas.width);
        const py = Math.floor(v * canvas.height);
        const idx = (py * canvas.width + px) * 4;
        
        // If pixel is bright (landmass)
        if (imgData[idx] > 128) {
          const R = 4.5;
          positions[pIdx++] = R * Math.sin(phi) * Math.cos(theta);
          positions[pIdx++] = R * Math.cos(phi);
          positions[pIdx++] = R * Math.sin(phi) * Math.sin(theta);
        }
      }
      resolve(positions);
    };
    
    img.onerror = () => {
      console.warn("Failed to load earth-mask.png. Falling back to sphere.");
      resolve(generateSwarm(count, 4.5)); // Fallback
    };
  });
};
