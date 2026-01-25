import { Linking, Platform } from 'react-native';

import { openExternalMaps, openMessenger, openViber } from '../linkingUtils';

const setPlatformOS = (os: string) => {
  Object.defineProperty(Platform, 'OS', {
    value: os,
  });
};

describe('openExternalMaps', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('prefers Apple Maps on iOS when coordinates are provided', async () => {
    setPlatformOS('ios');

    const canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const opened = await openExternalMaps({ latitude: 14.1, longitude: 121.2, label: 'Test' });

    expect(opened).toBe(true);
    expect(canOpenURL).toHaveBeenCalledWith('http://maps.apple.com/?daddr=14.1%2C121.2');
    expect(openURL).toHaveBeenCalledWith('http://maps.apple.com/?daddr=14.1%2C121.2');
  });

  it('falls back to Google Maps directions when native deep link fails', async () => {
    setPlatformOS('android');

    jest.spyOn(Linking, 'canOpenURL').mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('no handler'))
      .mockResolvedValueOnce();

    const opened = await openExternalMaps({ latitude: 1, longitude: 2 });

    expect(opened).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('google.navigation:q=1%2C2');
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=1%2C2',
    );
  });

  it('opens a Google Maps search when coordinates are missing but address exists', async () => {
    setPlatformOS('ios');

    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const opened = await openExternalMaps({ address: '123 Main St', label: 'Clinic' });

    expect(opened).toBe(true);
    expect(openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Clinic%20-%20123%20Main%20St',
    );
  });
});

describe('openViber', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns false for empty phone', async () => {
    const result = await openViber('');
    expect(result).toBe(false);
  });

  it('cleans phone number and tries viber scheme', async () => {
    const canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const result = await openViber('+63 912-345-6789');

    expect(result).toBe(true);
    // +639123456789 -> %2B639123456789
    expect(canOpenURL).toHaveBeenCalledWith('viber://chat?number=%2B639123456789');
    expect(openURL).toHaveBeenCalledWith('viber://chat?number=%2B639123456789');
  });

  it('tries contact scheme if chat scheme fails', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockImplementation(async (url) => url.includes('contact'));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const result = await openViber('123');
    expect(result).toBe(true);
    expect(openURL).toHaveBeenCalledWith('viber://contact?number=123');
  });

  it('returns false if viber is not installed (no fallback)', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const result = await openViber('123');
    expect(result).toBe(false);
  });
});

describe('openMessenger', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns false for empty id', async () => {
    const result = await openMessenger('');
    expect(result).toBe(false);
  });

  it('tries fb-messenger scheme first', async () => {
    const canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const result = await openMessenger('user123');
    expect(result).toBe(true);
    expect(canOpenURL).toHaveBeenCalledWith('fb-messenger://user-thread/user123');
    expect(openURL).toHaveBeenCalledWith('fb-messenger://user-thread/user123');
  });

  it('falls back to m.me web link if app not installed', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockImplementation(async (url) => url.startsWith('http'));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const result = await openMessenger('user123');
    expect(result).toBe(true);
    expect(openURL).toHaveBeenCalledWith('https://m.me/user123');
  });
});

