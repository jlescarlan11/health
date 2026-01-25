import { Linking, Platform } from 'react-native';

export type OpenExternalMapsParams = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  address?: string;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const openExternalMaps = async ({
  latitude,
  longitude,
  label,
  address,
}: OpenExternalMapsParams): Promise<boolean> => {
  const hasCoords = isFiniteNumber(latitude) && isFiniteNumber(longitude);
  const destinationCoords = hasCoords ? `${latitude},${longitude}` : '';
  const destinationText = [label, address].filter(Boolean).join(' - ').trim();

  const candidates: string[] = [];

  if (hasCoords) {
    if (Platform.OS === 'ios') {
      candidates.push(`http://maps.apple.com/?daddr=${encodeURIComponent(destinationCoords)}`);
    } else if (Platform.OS === 'android') {
      candidates.push(`google.navigation:q=${encodeURIComponent(destinationCoords)}`);
    }

    candidates.push(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationCoords)}`,
    );
  } else if (destinationText) {
    candidates.push(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationText)}`,
    );
  } else {
    return false;
  }

  for (const url of candidates) {
    const supported = await Linking.canOpenURL(url).catch(() => false);

    if (!supported && !url.startsWith('http')) continue;

    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // Try the next candidate.
    }
  }

  return false;
};
