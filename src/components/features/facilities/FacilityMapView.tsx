import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../../store';
import { selectFacility } from '../../../store/facilitiesSlice';
import { Facility } from '../../../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FacilityCard } from '../../common/FacilityCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { FeatureCollection, Geometry, GeoJsonProperties, LineString } from 'geojson';
import { getDirections, downloadOfflineMap } from '../../../services/mapService';

// Lazy load Mapbox to prevent module load errors
let Mapbox: any = null;
let mapboxImportError: Error | null = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    Mapbox = require('@rnmapbox/maps');
  } catch (error: any) {
    mapboxImportError = error;
    console.warn('@rnmapbox/maps native module not available:', error?.message);
  }
} else {
  console.log('Running in Expo Go - Mapbox disabled');
}

// Initialize Mapbox if available
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (Mapbox && MAPBOX_TOKEN) {
  try {
    Mapbox.setAccessToken(MAPBOX_TOKEN);
  } catch (error) {
    console.warn('Failed to set Mapbox access token:', error);
    Mapbox = null; // Disable Mapbox if initialization fails
  }
} else if (Mapbox && !MAPBOX_TOKEN) {
  console.warn('Mapbox token not found. Map may not render correctly.');
}

const NAGA_CITY_COORDINATES = [123.1948, 13.6218]; // Longitude, Latitude
const DEFAULT_ZOOM_LEVEL = 13;

export const FacilityMapView: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { facilities, selectedFacilityId, userLocation } = useSelector(
    (state: RootState) => state.facilities,
  );

  const [routeGeoJSON, setRouteGeoJSON] = useState<LineString | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ duration: number; distance: number } | null>(null);

  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM_LEVEL);

  // Show fallback if Mapbox is not available
  if (!Mapbox) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center' }}>
            Map View Unavailable
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.error }}>
            {isExpoGo
              ? 'Mapbox is not supported in Expo Go.'
              : '@rnmapbox native module not available.'}
            {'\n'}
            {mapboxImportError?.message}
          </Text>
          <Text
            variant="bodySmall"
            style={{ marginTop: 16, textAlign: 'center', color: theme.colors.onSurfaceVariant }}
          >
            {isExpoGo
              ? 'Please use a development build to view the map.\nRun: npx expo run:android'
              : 'Please rebuild your app with a development build.\nRun: npx expo run:android'}
          </Text>
        </View>
      </View>
    );
  }

  // Get selected facility object
  const selectedFacility = useMemo(
    () => facilities.find((f: Facility) => f.id === selectedFacilityId),
    [facilities, selectedFacilityId],
  );

  // Convert facilities to GeoJSON FeatureCollection
  const facilityFeatures = useMemo((): FeatureCollection<Geometry, GeoJsonProperties> => {
    return {
      type: 'FeatureCollection',
      features: facilities.map((f: Facility) => ({
        type: 'Feature',
        id: f.id,
        properties: {
          id: f.id,
          type: f.type,
          yakapAccredited: f.yakapAccredited,
          name: f.name,
          icon: f.type === 'Hospital' ? 'hospital-box' : 'hospital-building', // Simplified logic
        },
        geometry: {
          type: 'Point',
          coordinates: [f.longitude, f.latitude],
        },
      })),
    };
  }, [facilities]);

  useEffect(() => {
    // Initiate offline map download
    downloadOfflineMap();
  }, []);

  // Fetch route when facility is selected and user location is available
  useEffect(() => {
    if (selectedFacility && userLocation) {
      const fetchRoute = async () => {
        const start: [number, number] = [userLocation.longitude, userLocation.latitude];
        const end: [number, number] = [selectedFacility.longitude, selectedFacility.latitude];
        const result = await getDirections(start, end);

        if (result && result.routes.length > 0) {
          setRouteGeoJSON(result.routes[0].geometry);
          setRouteInfo({
            duration: result.routes[0].duration,
            distance: result.routes[0].distance,
          });

          // Fit bounds to show route
          if (cameraRef.current) {
            // Basic bbox calculation
            const minLng = Math.min(start[0], end[0]);
            const minLat = Math.min(start[1], end[1]);
            const maxLng = Math.max(start[0], end[0]);
            const maxLat = Math.max(start[1], end[1]);

            cameraRef.current.fitBounds(
              [maxLng, maxLat],
              [minLng, minLat],
              [50, 50, 300, 50], // padding
              1000, // duration
            );
          }
        } else {
          setRouteGeoJSON(null);
          setRouteInfo(null);
        }
      };
      fetchRoute();
    } else {
      setRouteGeoJSON(null);
      setRouteInfo(null);
    }
  }, [selectedFacility, userLocation]);

  // Center on selected facility if no user location (and thus no route)
  useEffect(() => {
    if (selectedFacility && !userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [selectedFacility.longitude, selectedFacility.latitude],
        zoomLevel: 15,
        animationDuration: 1000,
      });
    }
  }, [selectedFacility, userLocation]);

  const handleZoomIn = async () => {
    if (cameraRef.current) {
      const newZoom = Math.min(currentZoom + 1, 20);
      setCurrentZoom(newZoom);
      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        animationDuration: 300,
      });
    }
  };

  const handleZoomOut = async () => {
    if (cameraRef.current) {
      const newZoom = Math.max(currentZoom - 1, 0);
      setCurrentZoom(newZoom);
      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        animationDuration: 300,
      });
    }
  };

  const handleCenterOnUser = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 15,
        animationDuration: 1000,
      });
      setCurrentZoom(15);
    } else if (!userLocation) {
      Alert.alert('Location not available', 'Please enable location services.');
    }
  };

  const handleCenterOnNaga = () => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: NAGA_CITY_COORDINATES,
        zoomLevel: DEFAULT_ZOOM_LEVEL,
        animationDuration: 1000,
      });
      setCurrentZoom(DEFAULT_ZOOM_LEVEL);
    }
  };

  const onShapePress = (event: any) => {
    const feature = event.features[0];
    if (feature.properties?.cluster) {
      if (cameraRef.current) {
        const expansionZoom = currentZoom + 2;
        cameraRef.current.setCamera({
          centerCoordinate: feature.geometry.coordinates,
          zoomLevel: expansionZoom,
          animationDuration: 500,
        });
        setCurrentZoom(expansionZoom);
      }
    } else {
      const id = feature.properties?.id;
      if (id) {
        dispatch(selectFacility(id));
      }
    }
  };

  const handleMapPress = () => {
    if (selectedFacilityId) {
      dispatch(selectFacility(null));
    }
  };

  const onCameraChanged = (state: any) => {
    if (state && state.properties && state.properties.zoomLevel) {
      setCurrentZoom(state.properties.zoomLevel);
    }
  };

  const navigateToDetails = () => {
    if (selectedFacility) {
      navigation.navigate('FacilityDetails', { facilityId: selectedFacility.id });
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        ref={mapRef}
        onPress={handleMapPress}
        onCameraChanged={onCameraChanged}
        styleURL={Mapbox.StyleURL.Street}
        logoEnabled={false}
        scaleBarEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: NAGA_CITY_COORDINATES,
            zoomLevel: DEFAULT_ZOOM_LEVEL,
          }}
        />

        <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />

        {/* Route Line */}
        {routeGeoJSON && (
          <Mapbox.ShapeSource
            id="routeSource"
            shape={{ type: 'Feature', geometry: routeGeoJSON, properties: {} }}
          >
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: theme.colors.primary,
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.8,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        <Mapbox.ShapeSource
          id="facilitiesSource"
          shape={facilityFeatures}
          cluster
          clusterRadius={50}
          clusterMaxZoomLevel={16}
          onPress={onShapePress}
        >
          <Mapbox.CircleLayer
            id="clusters"
            belowLayerID="pointCount"
            filter={['has', 'point_count']}
            style={{
              circleColor: theme.colors.primary,
              circleRadius: 18,
              circleStrokeWidth: 2,
              circleStrokeColor: 'white',
            }}
          />

          <Mapbox.SymbolLayer
            id="pointCount"
            filter={['has', 'point_count']}
            style={{
              textField: '{point_count_abbreviated}',
              textSize: 12,
              textColor: 'white',
              textIgnorePlacement: false,
              textAllowOverlap: true,
            }}
          />

          <Mapbox.CircleLayer
            id="facilityBackground"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: 'white',
              circleRadius: 12,
            }}
          />

          <Mapbox.CircleLayer
            id="facilityPoints"
            aboveLayerID="facilityBackground"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: [
                'match',
                ['get', 'type'],
                'Hospital',
                theme.colors.secondary,
                'Health Center',
                theme.colors.primary,
                theme.colors.primary,
              ],
              circleRadius: 10,
            }}
          />

          <Mapbox.SymbolLayer
            id="yakapStar"
            aboveLayerID="facilityPoints"
            filter={[
              'all',
              ['!', ['has', 'point_count']],
              ['==', ['get', 'yakapAccredited'], true],
            ]}
            style={{
              textField: '★', // Unicode Star
              textColor: theme.colors.secondary,
              textSize: 14,
              textAllowOverlap: true,
              textIgnorePlacement: true,
              textAnchor: 'center',
              textTranslate: [0, 0],
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      <View style={[styles.controls, { top: insets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleCenterOnUser}
          accessibilityLabel="Center on my location"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleCenterOnNaga}
          accessibilityLabel="Center on Naga City"
        >
          <MaterialCommunityIcons name="compass" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleZoomIn}
          accessibilityLabel="Zoom in"
        >
          <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleZoomOut}
          accessibilityLabel="Zoom out"
        >
          <MaterialCommunityIcons name="minus" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      {selectedFacility && (
        <View style={[styles.cardContainer, { paddingBottom: insets.bottom + 16 }]}>
          <FacilityCard
            facility={selectedFacility}
            showDistance={true}
            distance={selectedFacility.distance}
            onPress={navigateToDetails}
            style={styles.card}
          />
          {routeInfo && (
            <View style={[styles.routeInfoBadge, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="car" size={16} color={theme.colors.onPrimary} />
              <Text style={[styles.routeInfoText, { color: theme.colors.onPrimary }]}>
                {Math.round(routeInfo.duration / 60)} min • {(routeInfo.distance / 1000).toFixed(1)}{' '}
                km
              </Text>
            </View>
          )}
        </View>
      )}

      {!selectedFacility && (
        <View
          style={[styles.legend, { top: insets.top + 16, backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme.colors.secondary }]} />
            <Text style={[styles.legendText, { color: theme.colors.onSurface }]}>Hospital</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.legendText, { color: theme.colors.onSurface }]}>
              Health Center
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={{ color: theme.colors.secondary, fontSize: 12, marginRight: 6 }}>★</Text>
            <Text style={[styles.legendText, { color: theme.colors.onSurface }]}>YAKAP</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  controls: {
    position: 'absolute',
    right: 16,
    flexDirection: 'column',
    gap: 12,
  },
  controlButton: {
    padding: 10,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  cardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  card: {
    elevation: 8,
  },
  routeInfoBadge: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
  },
  routeInfoText: {
    fontWeight: 'bold',
    marginLeft: 6,
  },
  legend: {
    position: 'absolute',
    left: 16,
    padding: 12,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
