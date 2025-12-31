import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const RecommendationScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Text style={styles.title} accessibilityRole="header">Recommendations</Text>
      <Text>Care recommendations will appear here.</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 }
});
