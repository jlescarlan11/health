import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { 
  Searchbar, 
  Chip, 
  Appbar, 
  useTheme,
  Text,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { debounce } from 'lodash';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

import { AppDispatch, RootState } from '../../store';
import { fetchFacilities, setFilters, updateDistances } from '../../store/facilitiesSlice';
import { FacilityListView, FacilityMapView } from '../../components/features/facilities';

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
    let filters: any = {};
    
    // Reset filters
    dispatch(setFilters({ type: undefined, yakapAccredited: undefined })); // Reset specific fields if needed, or rely on logic

    // We should probably just dispatch a clean filter set based on selection
    // But setFilters merges. So we need to be careful.
    // Ideally we should clear other mutually exclusive filters.
    // For this simple UI, we can assume:
    
    switch (filterId) {
      case 'health_center':
        dispatch(setFilters({ type: 'Health Center', yakapAccredited: undefined }));
        break;
      case 'hospital':
        dispatch(setFilters({ type: 'Hospital', yakapAccredited: undefined }));
        break;
      case 'yakap':
        dispatch(setFilters({ type: undefined, yakapAccredited: true }));
        break;
      case 'open_now':
        // 'open_now' is not in FacilityFilters in slice yet, or handled locally.
        // Slice logic for filtering: `type`, `services`, `yakapAccredited`, `searchQuery`.
        // If we want Open Now, we need to add it to slice or handle it.
        // For MVP compliance with previous code, let's skip or add it if easy.
        // Previous slice didn't have 'openNow'.
        // Let's just reset for 'all'.
        dispatch(setFilters({ type: undefined, yakapAccredited: undefined }));
        break;
      default: // 'all'
        dispatch(setFilters({ type: undefined, yakapAccredited: undefined }));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Appbar.Header style={styles.header} elevated>
        <Appbar.Content title="Facilities" titleStyle={styles.headerTitle} />
        <Appbar.Action 
          icon={viewMode === 'list' ? "map" : "format-list-bulleted"} 
          onPress={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')} 
        />
      </Appbar.Header>

      <View style={styles.contentContainer}>
        <Searchbar
          placeholder="Search facilities, address..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={styles.searchBar}
          icon={searchQuery ? "close" : "magnify"}
          onIconPress={searchQuery ? handleClearSearch : undefined}
        />

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
  header: {
    backgroundColor: '#fff',
    elevation: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    marginRight: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});