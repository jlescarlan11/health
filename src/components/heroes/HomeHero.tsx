import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import HeroSection from './HeroSection';

const HomeHero: React.FC = () => {
  const theme = useTheme();

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = 'Kumusta!';

  return (
    <HeroSection 
      colors={[theme.colors.secondaryContainer, theme.colors.background]} 
      height={280}
    >
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
            {formattedDate}
          </Text>
          <Text style={[styles.greeting, { color: theme.colors.primary }]}>{greeting}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>
            How can we help you today?
          </Text>
        </View>
      </View>
    </HeroSection>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end', // Push content to the bottom of the hero area
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  contentContainer: {
    gap: 8,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
  },
  greeting: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
    lineHeight: 30,
    opacity: 0.9,
  },
});

export default HomeHero;
