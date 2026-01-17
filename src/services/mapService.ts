import { LineString } from 'geojson';
import Constants from 'expo-constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Mapbox: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Mapbox = require('@rnmapbox/maps');
  } catch {
    console.warn('Mapbox native module not found in service');
  }
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Naga City Bounding Box (approximate)
const NAGA_BOUNDS = {
  ne: [123.25, 13.68],
  sw: [123.15, 13.58],
};

export const getDirections = async (
  start: [number, number],
  end: [number, number],
  profile: 'walking' | 'driving' = 'driving',
): Promise<{
  routes: {
    geometry: LineString;
    duration: number;
    distance: number;
  }[];
} | null> => {
  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token missing');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`,
    );

    const data = await response.json();

    if (data.code !== 'Ok') {
      console.error('Mapbox Directions Error:', data.code);
      return null;
    }

    return {
      routes: data.routes.map((route: { geometry: LineString; duration: number; distance: number }) => ({
        geometry: route.geometry,
        duration: route.duration,
        distance: route.distance,
      })),
    };
  } catch (error: unknown) {
    console.error('Error fetching directions:', error);
    return null;
  }
};

export const downloadOfflineMap = async (
  name: string = 'NagaCity',
  styleUrl: string = Mapbox?.StyleURL?.Street || 'mapbox://styles/mapbox/streets-v11',
) => {
  if (!Mapbox) return;

  try {
    await Mapbox.offlineManager.createPack(
      {
        name,
        styleURL: styleUrl,
        bounds: [NAGA_BOUNDS.ne, NAGA_BOUNDS.sw],
        minZoom: 10,
        maxZoom: 16,
      },
      (_region: unknown, status: { percentage: number }) => {
        console.log(`Offline pack ${name} progress: ${status.percentage}`);
      },
      (_region: unknown, _error: unknown) => {
        console.error(`Offline pack ${name} error:`, _error);
      },
    );
    console.log(`Offline pack ${name} download started`);
  } catch (error: unknown) {
    console.error('Error creating offline pack:', error);
  }
};
