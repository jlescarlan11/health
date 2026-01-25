import { Linking, Platform } from 'react-native';

export type OpenExternalMapsParams = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  address?: string;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const cleanPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters except +
  return phone.replace(/[^\d+]/g, '');
};

export const openViber = async (phone: string): Promise<boolean> => {
  if (!phone) return false;

  const cleanPhone = cleanPhoneNumber(phone);
  // Viber requires the number to be in international format (e.g., +63...)
  // If the user didn't provide +, we might need to assume or leave it.
  // For safety, we just pass the cleaned number.
  // Note: encoded '+' is %2B.
  const encodedPhone = encodeURIComponent(cleanPhone);

  const candidates: string[] = [
    `viber://chat?number=${encodedPhone}`,
    `viber://contact?number=${encodedPhone}`, // Alternative scheme
  ];

  for (const url of candidates) {
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (supported) {
      try {
        await Linking.openURL(url);
        return true;
      } catch {
        // Continue to next candidate
      }
    }
  }
  
  // Web fallback isn't standard for Viber mobile, but we can return false
  // to let the caller handle the "App not found" state.
  return false;
};

export const openMessenger = async (id: string): Promise<boolean> => {
  if (!id) return false;

  const candidates: string[] = [
    `fb-messenger://user-thread/${id}`,
    `fb-messenger://user/${id}`, // Older scheme
    `https://m.me/${id}`, // Robust web fallback
    `https://www.messenger.com/t/${id}`, // Desktop/Universal fallback
  ];

  for (const url of candidates) {
    const isWeb = url.startsWith('http');
    const supported = await Linking.canOpenURL(url).catch(() => false);

    if (supported || isWeb) {
      try {
        await Linking.openURL(url);
        return true;
      } catch {
        // Continue to next candidate
      }
    }
  }

  return false;
};

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
