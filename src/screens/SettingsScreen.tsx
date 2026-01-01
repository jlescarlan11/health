import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Button } from '../components/common';
import { syncFacilities } from '../services/syncService';
import { format } from 'date-fns';

export const SettingsScreen = () => {
  const [syncing, setSyncing] = useState(false);
  const lastSync = useSelector((state: RootState) => state.offline.lastSync);
  const isOffline = useSelector((state: RootState) => state.offline.isOffline);

  const handleSync = async () => {
    if (isOffline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your internet connection.');
      return;
    }

    setSyncing(true);
    try {
      await syncFacilities();
      Alert.alert('Success', 'Data synchronized successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to synchronize data.');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const formattedLastSync = lastSync 
    ? format(new Date(lastSync), 'PPpp') 
    : 'Never';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Synchronization</Text>
        <Text style={styles.infoText}>Last Synced: {formattedLastSync}</Text>
        <Button 
          title={syncing ? "Syncing..." : "Sync Now"} 
          onPress={handleSync} 
          disabled={syncing || isOffline}
          variant="primary"
        />
        {isOffline && <Text style={styles.warningText}>You are currently offline.</Text>}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  section: { backgroundColor: 'white', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2, paddingVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#333' },
  infoText: { marginBottom: 15, color: '#666' },
  warningText: { marginTop: 10, color: '#d32f2f', fontSize: 12 }
});
