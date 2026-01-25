import { renderHook, act } from '@testing-library/react-native';
import { useUserLocation } from '../src/hooks/useUserLocation';
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { sendFacilitySignal } from '../src/services/facilityService';

// Mocks
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-constants', () => ({
  installationId: 'test-device-id',
  expoConfig: { extra: {} },
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../src/services/facilityService', () => ({
  sendFacilitySignal: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn();
  return RN;
});

describe('useUserLocation Proximity Logic', () => {
  const mockDispatch = jest.fn();
  const mockFacilities = [
    {
      id: 'naga-city-hospital',
      name: 'Naga City Hospital',
      latitude: 13.6218,
      longitude: 123.1876,
      type: 'Hospital',
      services: ['Emergency'],
    },
  ];

  const nearLocation = {
    coords: { latitude: 13.6218, longitude: 123.1876 },
    timestamp: 1000,
  };

  const farLocation = {
    coords: { latitude: 13.0, longitude: 123.0 },
    timestamp: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(1000);
    
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        facilities: {
          facilities: mockFacilities,
        },
      }),
    );
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    
    // Default to far away
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(farLocation);
    
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({
      remove: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts a dwell timer when entering proximity and signals after 3 minutes', async () => {
    let watchCallback: (loc: any) => void = () => {};
    (Location.watchPositionAsync as jest.Mock).mockImplementation((opts, cb) => {
      watchCallback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    // Mock initial position to be NEAR so we don't have race conditions with far position
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(nearLocation);

    renderHook(() => useUserLocation({ watch: true }));

    // Wait for useEffect and getCurrentLocation to finish
    await act(async () => {
      await Promise.resolve();
    });

    // Should NOT signal immediately
    expect(sendFacilitySignal).not.toHaveBeenCalled();

    // Advance 4 minutes
    jest.advanceTimersByTime(4 * 60 * 1000);
    
    await act(async () => {
      watchCallback({
        ...nearLocation,
        timestamp: Date.now(),
      });
    });

    // Should HAVE signaled now
    expect(sendFacilitySignal).toHaveBeenCalledWith(
      'naga-city-hospital',
      expect.any(String)
    );
  });

  it('resets dwell timer if user leaves proximity before threshold', async () => {
    let watchCallback: (loc: any) => void = () => {};
    (Location.watchPositionAsync as jest.Mock).mockImplementation((opts, cb) => {
      watchCallback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(nearLocation);

    renderHook(() => useUserLocation({ watch: true }));

    await act(async () => {
      await Promise.resolve();
    });

    // Wait 2 minutes
    jest.advanceTimersByTime(2 * 60 * 1000);

    // User leaves proximity
    await act(async () => {
      watchCallback({
        ...farLocation,
        timestamp: Date.now(),
      });
    });

    // Wait another 2 minutes
    jest.advanceTimersByTime(2 * 60 * 1000);

    await act(async () => {
      watchCallback({
        ...farLocation,
        timestamp: Date.now(),
      });
    });

    expect(sendFacilitySignal).not.toHaveBeenCalled();
  });

  it('does not send multiple signals for the same dwell session', async () => {
    let watchCallback: (loc: any) => void = () => {};
    (Location.watchPositionAsync as jest.Mock).mockImplementation((opts, cb) => {
      watchCallback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(nearLocation);

    renderHook(() => useUserLocation({ watch: true }));

    await act(async () => {
      await Promise.resolve();
    });

    // Signal after 3 mins
    jest.advanceTimersByTime(3 * 60 * 1000 + 1000);

    await act(async () => {
      watchCallback({
        ...nearLocation,
        timestamp: Date.now(),
      });
    });

    expect(sendFacilitySignal).toHaveBeenCalledTimes(1);

    // Still there after 5 more mins
    jest.advanceTimersByTime(5 * 60 * 1000);

    await act(async () => {
      watchCallback({
        ...nearLocation,
        timestamp: Date.now(),
      });
    });

    expect(sendFacilitySignal).toHaveBeenCalledTimes(1);
  });
});