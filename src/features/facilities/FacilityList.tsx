import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FacilityListView } from '../../components/features/facilities';

const FacilityList = () => {
  return (
    <SafeAreaView style={styles.container}>
      <FacilityListView />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default FacilityList;
