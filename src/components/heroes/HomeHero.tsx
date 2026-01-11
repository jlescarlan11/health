
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from 'react-native-paper';
import HeroSection from './HeroSection';
import { RootState } from '../../store';

const HomeHero: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const theme = useTheme();

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = user ? `Kumusta, ${user.displayName || 'User'}!` : 'Kumusta!';

  return (
    <HeroSection colors={[theme.colors.primaryContainer, theme.colors.background]} height={220}>
      <View style={styles.container}>
        <Text style={[styles.date, { color: theme.colors.onPrimaryContainer }]}>{formattedDate}</Text>
        <Text style={[styles.greeting, { color: theme.colors.primary }]}>{greeting}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>How can we help you today?</Text>
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
    fontWeight: '500',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 18,
    marginTop: 8,
  },
});

export default HomeHero;
