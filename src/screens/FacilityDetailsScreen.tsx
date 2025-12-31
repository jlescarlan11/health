import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

type FacilityDetailsRouteProp = RouteProp<RootStackParamList, 'FacilityDetails'>;

export const FacilityDetailsScreen = () => {
  const route = useRoute<FacilityDetailsRouteProp>();
  const { facilityId } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Text style={styles.title} accessibilityRole="header">Facility Details</Text>
      <Text>ID: {facilityId}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 }
});
