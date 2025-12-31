import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, Card, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchFacilities } from '../../store/facilitySlice';

const FacilityList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { facilities, isLoading, error } = useSelector((state: RootState) => state.facilities);

  useEffect(() => {
    dispatch(fetchFacilities());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={facilities}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Card.Title 
            title={item.name} 
            subtitle={item.type}
            right={(props) => item.yakapAccredited ? <Chip icon="check-decagram" style={styles.chip}>YAKAP</Chip> : null}
          />
          <Card.Content>
            <Text variant="bodyMedium">{item.address}</Text>
            {item.phone && <Text variant="bodySmall">Phone: {item.phone}</Text>}
            <Text variant="bodySmall">Services: {item.services.join(', ')}</Text>
          </Card.Content>
        </Card>
      )}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  chip: {
    marginRight: 16,
    backgroundColor: '#e1bee7',
  },
});

export default FacilityList;
