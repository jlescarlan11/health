import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MainTabScreenProps } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import StandardHeader from '../components/common/StandardHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = MainTabScreenProps<'Profile'>;

export const ProfileScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<Props['navigation']>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <StandardHeader 
        title="Health ID" 
        showBackButton={false}
      />
      <View style={styles.content}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="account" size={80} color={theme.colors.primary} />
        </View>
        
        <Text variant="headlineSmall" style={styles.title}>Your Health Profile</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          This section will soon allow you to manage your local health credentials and YAKAP enrollment status.
        </Text>
        
        <View style={styles.card}>
          <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.cardText}>
            Naga City Health ID features are currently being finalized.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '700',
    color: '#45474B',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 151, 119, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 151, 119, 0.1)',
  },
  cardText: {
    marginLeft: 12,
    color: '#379777',
    flex: 1,
  },
});