import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Searchbar, Chip, useTheme } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import { debounce } from 'lodash';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

import { AppDispatch } from '../../store';
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

export const FacilityDirectoryScreen = () => {
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
    () =>
      debounce((query: string) => {
        dispatch(setFilters({ searchQuery: query }));
      }, 500),
    [dispatch],
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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StandardHeader title="Find Facilities" showBackButton />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="Search facilities, address..."
              onChangeText={handleSearchChange}
              value={searchQuery}
              style={[styles.searchBar, { borderColor: theme.colors.outline }]}
              icon={searchQuery ? 'close' : 'magnify'}
              onIconPress={searchQuery ? handleClearSearch : undefined}
            />
          </View>

          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {FILTERS.map((filter) => (
                <Chip
                  key={filter.id}
                  selected={activeFilter === filter.id}
                  onPress={() => handleFilterPress(filter.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
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
      </KeyboardAvoidingView>
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
