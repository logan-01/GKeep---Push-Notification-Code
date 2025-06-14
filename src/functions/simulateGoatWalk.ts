import { database } from "../lib/firebase/config";

export function simulateGoatWalk(
  goatId: string,
  startLat: number,
  startLng: number,
  steps = 100,
  stepSize = 0.00005,
  delay = 1000
) {
  const minLat = startLat - 0.0003;
  const maxLat = startLat + 0.0003;
  const minLng = startLng - 0.0003;
  const maxLng = startLng + 0.0003;

  let lat = startLat;
  let lng = startLng;
  let step = 0;

  const interval = setInterval(async () => {
    if (step >= steps) {
      clearInterval(interval);
      console.log("Simulation complete.");
      return;
    }

    const latChange = (Math.floor(Math.random() * 3) - 1) * stepSize;
    const lngChange = (Math.floor(Math.random() * 3) - 1) * stepSize;

    lat = Math.min(Math.max(lat + latChange, minLat), maxLat);
    lng = Math.min(Math.max(lng + lngChange, minLng), maxLng);

    const location = {
      latitude: lat,
      longitude: lng,
      timestamp: Date.now(),
    };

    try {
      await database.ref(`Goats/${goatId}/latitude`).set(lat);
      await database.ref(`Goats/${goatId}/longitude`).set(lng);
      console.log(`Step ${step + 1}: Location updated`, location);
    } catch (error) {
      console.error("Failed to update location:", error);
    }

    step++;
  }, delay);
}
