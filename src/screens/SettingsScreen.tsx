import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const SettingsScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Text style={styles.title}>Settings</Text>
      <Text>App settings will go here.</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 }
});
