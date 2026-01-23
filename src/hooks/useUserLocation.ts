import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useDispatch } from 'react-redux';
import { setUserLocation } from '../store/facilitiesSlice';
import { Alert, Linking } from 'react-native';

interface UseUserLocationOptions {
  watch?: boolean;
  requestOnMount?: boolean;
  showDeniedAlert?: boolean;
}

export const useUserLocation = (options: UseUserLocationOptions = { watch: false }) => {
  const { watch = false, requestOnMount = true, showDeniedAlert = true } = options;
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const dispatch = useDispatch();

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        if (showDeniedAlert) {
          Alert.alert(
            'Location Permission Required',
            'This app needs access to your location to show nearby facilities. Please enable it in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        }
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      return false;
    }
  }, [showDeniedAlert]);

  const getCurrentLocation = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(location);
      dispatch(
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      );
    } catch (error) {
      setErrorMsg('Error getting location');
      console.warn(error);
    }
  }, [dispatch, requestPermission]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(currentStatus);

      if (currentStatus !== 'granted') {
        if (!requestOnMount) return;
        const hasPermission = await requestPermission();
        if (!hasPermission) return;
      }

      // Get initial location immediately
      getCurrentLocation();

      if (watch) {
        try {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000, // Update every 5 seconds
              distanceInterval: 10, // Update every 10 meters
            },
            (newLocation) => {
              setLocation(newLocation);
              dispatch(
                setUserLocation({
                  latitude: newLocation.coords.latitude,
                  longitude: newLocation.coords.longitude,
                }),
              );
            },
          );
        } catch (error) {
          console.warn('Error watching position:', error);
        }
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [dispatch, requestPermission, watch, getCurrentLocation, requestOnMount]);

  return { location, errorMsg, permissionStatus, requestPermission, getCurrentLocation };
};
