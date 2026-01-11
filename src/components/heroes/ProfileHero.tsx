
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from 'react-native-paper';
import HeroSection from './HeroSection';
import { RootState } from '../../store';

const ProfileHero: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const theme = useTheme();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <HeroSection colors={[theme.colors.secondaryContainer, theme.colors.background]} height={250}>
      <View style={styles.container}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.initials, { color: theme.colors.onPrimary }]}>{getInitials(user?.displayName)}</Text>
        </View>
        <Text style={[styles.phone, { color: theme.colors.onSurface }]}>{user?.phoneNumber || 'No phone number'}</Text>
        <Text style={[styles.memberSince, { color: theme.colors.onSurfaceVariant }]}>Member since {memberSince}</Text>
      </View>
    </HeroSection>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  initials: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  phone: {
    fontSize: 20,
    fontWeight: '600',
  },
  memberSince: {
    fontSize: 14,
    marginTop: 6,
  },
});

export default ProfileHero;
