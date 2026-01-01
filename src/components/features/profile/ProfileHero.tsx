import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
      colors={['#8A2BE2', '#FFFFFF']}
      style={styles.container}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.displayName ? getInitials(user.displayName) : 'U'}
        </Text>
      </View>
      <Text style={styles.phoneNumber}>{user?.phoneNumber || 'No phone number'}</Text>
      <Text style={styles.memberSince}>
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#555',
  },
});

export default ProfileHero;
