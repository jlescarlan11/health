import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

interface SkeletonProps {
  style?: ViewStyle;
}

const SkeletonItem = ({ style }: { style: ViewStyle }) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[{ opacity, backgroundColor: theme.colors.surfaceVariant }, style]} />
  );
};

export const FacilityCardSkeleton: React.FC<SkeletonProps> = ({ style }) => {
  return (
    <Card style={[styles.card, style]} mode="elevated">
      <View style={styles.header}>
        <View>
          <SkeletonItem style={styles.title} />
          <SkeletonItem style={styles.subtitle} />
        </View>
        <SkeletonItem style={styles.chip} />
      </View>
      <Card.Content>
        <SkeletonItem style={styles.address} />
        <SkeletonItem style={styles.services} />
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 8,
  },
  title: {
    width: 150,
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    width: 100,
    height: 16,
    borderRadius: 4,
  },
  chip: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  address: {
    width: '90%',
    height: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  services: {
    width: '80%',
    height: 20,
    borderRadius: 4,
  },
});
