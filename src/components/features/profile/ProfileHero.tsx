import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';

type User = {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  metadata: {
    creationTime?: string;
  };
} | null;

const ProfileHero = ({ user }: { user: User }) => {
  const theme = useTheme();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `Member since ${date.toLocaleString('default', {
      month: 'long',
    })} ${date.getFullYear()}`;
  };

  return (
    <LinearGradient
      colors={[theme.colors.primaryContainer, theme.colors.background]}
      style={styles.container}
    >
      <View style={[styles.avatar, { borderColor: theme.colors.surface, backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
          {user?.displayName ? getInitials(user.displayName) : 'U'}
        </Text>
      </View>
      <Text style={[styles.phoneNumber, { color: theme.colors.onSurface }]}>{user?.phoneNumber || 'No phone number'}</Text>
      <Text style={[styles.memberSince, { color: theme.colors.onSurfaceVariant }]}>
        {user?.metadata?.creationTime
          ? formatDate(user.metadata.creationTime)
          : 'Member since long ago'}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
  },
});

export default ProfileHero;
