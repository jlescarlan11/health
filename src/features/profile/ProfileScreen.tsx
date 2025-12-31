import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Switch, Divider, List, SegmentedButtons, useTheme, Avatar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Constants from 'expo-constants';

import { RootState } from '../../store/store';
import { logout } from '../../store/authSlice';
import { setHighContrastMode, setFontSize } from '../../store/settingsSlice';
import { authService } from '../../services/authService';
import { RootStackParamList } from '../../types/navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

export const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { highContrastMode, fontSize } = useSelector((state: RootState) => state.settings);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              dispatch(logout());
              navigation.reset({
                index: 0,
                routes: [{ name: 'PhoneLogin' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out.');
            }
          },
        },
      ]
    );
  };

  const handleLoginNavigation = () => {
    navigation.navigate('PhoneLogin');
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.centerContent}>
          <Text variant="headlineMedium" style={styles.title}>Welcome</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Log in to access your profile and saved data.
          </Text>
          <Button 
            mode="contained" 
            onPress={handleLoginNavigation} 
            style={styles.loginButton}
          >
            Log In with Phone
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* User Info Section */}
        <View style={styles.section}>
          <View style={styles.header}>
            <Avatar.Icon size={64} icon="account" />
            <View style={styles.headerText}>
              <Text variant="titleLarge">
                {user?.displayName || 'User'}
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>
                {user?.phoneNumber || user?.email || 'No contact info'}
              </Text>
            </View>
          </View>
        </View>
        
        <Divider style={styles.divider} />

        {/* Accessibility Settings */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Accessibility</Text>
          
          <View style={styles.row}>
            <Text variant="bodyLarge">High Contrast Mode</Text>
            <Switch
              value={highContrastMode}
              onValueChange={(val) => dispatch(setHighContrastMode(val))}
            />
          </View>

          <View style={styles.settingBlock}>
            <Text variant="bodyLarge" style={styles.label}>Font Size</Text>
            <SegmentedButtons
              value={fontSize}
              onValueChange={(val) => dispatch(setFontSize(val as 'small' | 'medium' | 'large'))}
              buttons={[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ]}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* About Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>About</Text>
          <List.Item
            title="App Version"
            description={Constants.expoConfig?.version || '1.0.0'}
            left={props => <List.Icon {...props} icon="information" />}
          />
        </View>

        <View style={styles.logoutContainer}>
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ borderColor: theme.colors.error }}
            onPress={handleLogout}
          >
            Log Out
          </Button>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  loginButton: {
    width: '100%',
  },
  section: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
  },
  divider: {
    height: 1,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingBlock: {
    marginTop: 8,
  },
  label: {
    marginBottom: 12,
  },
  logoutContainer: {
    padding: 20,
    marginTop: 20,
  },
});
