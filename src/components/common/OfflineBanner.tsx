import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export const OfflineBanner = () => {
  const isOffline = useSelector((state: RootState) => state.offline.isOffline);
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.text}>You are offline. Showing cached data.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#323232',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
