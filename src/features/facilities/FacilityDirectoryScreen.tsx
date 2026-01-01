import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard, TouchableOpacity } from 'react-native';
import { 
  Searchbar, 
  Chip, 
  useTheme,
  Text,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { debounce } from 'lodash';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { AppDispatch, RootState } from '../../store';
import { fetchFacilities, setFilters, updateDistances } from '../../store/facilitiesSlice';
import { FacilityListView, FacilityMapView } from '../../components/features/facilities';
import StandardHeader from '../../components/common/StandardHeader';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'health_center', label: 'Health Centers' },
  { id: 'hospital', label: 'Hospitals' },
  { id: 'yakap', label: 'YAKAP Accredited' },
  { id: 'open_now', label: 'Open Now' },
];

// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FacilityDirectoryScreen.tsx:27', message: 'Before export definition', data: { moduleExports: typeof module !== 'undefined' ? Object.keys(module.exports || {}) : [], timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' } }) }).catch(() => {});
// #endregion

export const FacilityDirectoryScreen = () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FacilityDirectoryScreen.tsx:31', message: 'Component function entry', data: { componentDefined: true, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' } }) }).catch(() => {});
  // #endregion
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Load initial data
  useEffect(() => {
    dispatch(fetchFacilities({ page: 1, refresh: true }));

    // Request location and update distances
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          let location = await Location.getCurrentPositionAsync({});
          dispatch(updateDistances({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }));
        } catch (e) {
          console.warn('Error getting location', e);
        }
      }
    })();
  }, [dispatch]);

  // Debounce search dispatch
  const debouncedDispatch = React.useMemo(
    () => debounce((query: string) => {
      dispatch(setFilters({ searchQuery: query }));
    }, 500),
    [dispatch]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedDispatch(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    dispatch(setFilters({ searchQuery: '' }));
    Keyboard.dismiss();
  };

  const handleFilterPress = (filterId: string) => {
    setActiveFilter(filterId);
    
    // Default reset
    const baseFilter = { type: undefined, yakapAccredited: undefined, openNow: undefined };

    switch (filterId) {
      case 'health_center':
        dispatch(setFilters({ ...baseFilter, type: 'health_center' }));
        break;
      case 'hospital':
        dispatch(setFilters({ ...baseFilter, type: 'hospital' }));
        break;
      case 'yakap':
        dispatch(setFilters({ ...baseFilter, yakapAccredited: true }));
        break;
      case 'open_now':
        dispatch(setFilters({ ...baseFilter, openNow: true }));
        break;
      default: // 'all'
        dispatch(setFilters(baseFilter));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StandardHeader title="Find Facilities" />

      <View style={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search facilities, address..."
            onChangeText={handleSearchChange}
            value={searchQuery}
            style={styles.searchBar}
            icon={searchQuery ? "close" : "magnify"}
            onIconPress={searchQuery ? handleClearSearch : undefined}
          />
          <TouchableOpacity 
            onPress={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
            style={styles.viewToggle}
          >
            <Ionicons name={viewMode === 'list' ? "map-outline" : "list-outline"} size={28} color="#2E9B95" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTERS.map(filter => (
              <Chip
                key={filter.id}
                selected={activeFilter === filter.id}
                onPress={() => handleFilterPress(filter.id)}
                style={styles.chip}
                showSelectedOverlay
              >
                {filter.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {viewMode === 'list' ? (
           <FacilityListView />
        ) : (
          <FacilityMapView />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    // Removed white background/elevation to blend with screen
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#fff', // Keep searchbar white
  },
  viewToggle: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    // Add elevation/shadow to match searchbar if desired, or keep flat
    elevation: 1, 
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#fff', // Ensure chips have background if container doesn't
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});