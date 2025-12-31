import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { logout, setUser } from '../../store/userSlice';

export const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { user, isLoggedIn } = useSelector((state: RootState) => state.user);

  const handleLogin = () => {
    // Mock login
    dispatch(setUser({ uid: '123', email: 'test@example.com', displayName: 'John Doe' }));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Text variant="headlineMedium">Profile</Text>
      {isLoggedIn ? (
        <View style={styles.userInfo}>
          <Text>Welcome, {user?.displayName || user?.email}</Text>
          <Button mode="contained" onPress={handleLogout} style={styles.button}>
            Logout
          </Button>
        </View>
      ) : (
        <View style={styles.userInfo}>
          <Text>You are not logged in.</Text>
          <Button mode="contained" onPress={handleLogin} style={styles.button}>
            Log In (Mock)
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  userInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  button: {
    marginTop: 10,
  },
});
