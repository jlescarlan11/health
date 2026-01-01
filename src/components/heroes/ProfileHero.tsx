
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import HeroSection from './HeroSection';
import { RootState } from '../../store';

const ProfileHero: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <HeroSection colors={['#C3AED6', '#FFFFFF']} height={250}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{getInitials(user?.name)}</Text>
        </View>
        <Text style={styles.phone}>{user?.phone_number || 'No phone number'}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
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
    backgroundColor: '#6A1B9A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  initials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  phone: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
});

export default ProfileHero;
