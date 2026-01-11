import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard, TouchableOpacity } from 'react-native';
import { 
  Searchbar, 
  Chip, 
  useTheme,
  Text,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import { debounce } from 'lodash';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { AppDispatch, RootState } from '../../store';
import { fetchFacilities, setFilters } from '../../store/facilitiesSlice';
import { FacilityListView } from '../../components/features/facilities';
import StandardHeader from '../../components/common/StandardHeader';
import { FacilitiesStackParamList } from '../../navigation/types';
import { useUserLocation } from '../../hooks';

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
  const route = useRoute<RouteProp<FacilitiesStackParamList, 'FacilityDirectory'>>();
  const dispatch = useDispatch<AppDispatch>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Use the custom hook for location management
  // It will automatically update the Redux store with the user's location
  useUserLocation({ watch: false });

  // Load initial data
  useEffect(() => {
    dispatch(fetchFacilities({ page: 1, refresh: true }));
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

  // Handle route params (filter)
  useEffect(() => {
    if (route.params?.filter) {
      handleFilterPress(route.params.filter);
    }
  }, [route.params?.filter]);

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
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTERS.map(filter => (
              <Chip
                key={filter.id}
                selected={activeFilter === filter.id}
                onPress={() => handleFilterPress(filter.id)}
                style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
                showSelectedOverlay
                mode="outlined"
              >
                {filter.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <FacilityListView />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background color is handled by global theme in App.tsx but good to keep if needed, removed here to rely on SafeAreaView context or parent
  },
  contentContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  searchBar: {
    flex: 1,
    elevation: 0, // Kanso: Flat
    borderWidth: 1,
    borderColor: '#E0E2E3', // SurfaceVariant
    backgroundColor: '#fff', // Keep searchbar white
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