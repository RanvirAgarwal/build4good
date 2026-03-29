/**
 * NASA NeoWs (Near Earth Object Web Service) API Client
 * Fetches real asteroid close-approach data and maps it to our WebGL particle system.
 */

export interface NeoAsteroid {
  name: string;
  estimatedDiameterKm: number;
  missDistanceKm: number;
  isPotentiallyHazardous: boolean;
  relativeVelocityKmh: number;
}

const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
const NEO_FEED_URL = 'https://api.nasa.gov/neo/rest/v1/feed';

/**
 * Fetch 7-day asteroid feed from NASA NeoWs.
 * @param startDate ISO date string (YYYY-MM-DD). Defaults to today.
 * Returns a flat array of parsed asteroid objects (typically 100-180 items).
 */
export async function fetchNasaData(startDate?: string): Promise<NeoAsteroid[]> {
  const start = startDate ? new Date(startDate) : new Date();
  const startStr = start.toISOString().split('T')[0];
  const endStr = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const url = `${NEO_FEED_URL}?start_date=${startStr}&end_date=${endStr}&api_key=${NASA_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NASA API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const asteroids: NeoAsteroid[] = [];

    const neoByDate = data.near_earth_objects;
    for (const date of Object.keys(neoByDate)) {
      for (const neo of neoByDate[date]) {
        const closeApproach = neo.close_approach_data?.[0];
        if (!closeApproach) continue;

        asteroids.push({
          name: neo.name,
          estimatedDiameterKm: neo.estimated_diameter?.kilometers?.estimated_diameter_max ?? 0.01,
          missDistanceKm: parseFloat(closeApproach.miss_distance?.kilometers ?? '0'),
          isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid ?? false,
          relativeVelocityKmh: parseFloat(closeApproach.relative_velocity?.kilometers_per_hour ?? '0'),
        });
      }
    }

    asteroids.sort((a, b) => a.missDistanceKm - b.missDistanceKm);
    console.log(`[NASA API] Fetched ${asteroids.length} asteroids for ${startStr} to ${endStr}`);
    return asteroids;
  } catch (err) {
    console.error('[NASA API] Failed to fetch data, falling back to mock data:', err);
    return generateMockData();
  }
}

/**
 * Fallback mock data if the API is unavailable or rate-limited.
 */
function generateMockData(): NeoAsteroid[] {
  const mocks: NeoAsteroid[] = [];
  for (let i = 0; i < 120; i++) {
    const missDistKm = Math.pow(10, Math.random() * 8);
    let diameterKm = Math.pow(10, Math.random() * 3 - 2);

    // Enforce the narrative: close + big = empty danger quadrant
    if (missDistKm < 3e4 && diameterKm > 0.5) {
      diameterKm *= 0.01;
    }

    mocks.push({
      name: `MockNEO-${i}`,
      estimatedDiameterKm: diameterKm,
      missDistanceKm: missDistKm,
      isPotentiallyHazardous: missDistKm < 7.5e6 && diameterKm > 0.14,
      relativeVelocityKmh: 10000 + Math.random() * 100000,
    });
  }
  return mocks;
}
