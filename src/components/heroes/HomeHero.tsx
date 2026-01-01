
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import HeroSection from './HeroSection';
import { RootState } from '../../store/store';

const HomeHero: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = user ? `Kumusta, ${user.name}!` : 'Kumusta!';

  return (
    <HeroSection colors={['#A8D0E6', '#FFFFFF']} height={220}>
      <View style={styles.container}>
        <Text style={styles.date}>{formattedDate}</Text>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subtitle}>How can we help you today?</Text>
      </View>
    </HeroSection>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20, // Internal padding for text content
    paddingBottom: 20,
  },
  date: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A237E', 
    marginTop: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginTop: 8,
  },
});

export default HomeHero;
