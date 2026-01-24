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
  const theme = useTheme();
  return (
    <Card
      style={[
        styles.card,
        style,
        {
          backgroundColor: theme.colors.surface,
        },
      ]}
      mode="contained"
    >
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <SkeletonItem style={styles.icon} />
              <View style={{ flex: 1 }}>
                <SkeletonItem style={styles.titleLine} />
                <SkeletonItem style={styles.distance} />
              </View>
            </View>
          </View>
          <View style={styles.rightHeader}>
            <SkeletonItem style={styles.directionsButton} />
            <SkeletonItem style={styles.yakapBadge} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.statusRow}>
            <SkeletonItem style={styles.statusIcon} />
            <SkeletonItem style={styles.statusText} />
          </View>

          <SkeletonItem style={styles.addressLine} />

          <View style={styles.servicesRow}>
            <SkeletonItem style={styles.serviceChip} />
            <SkeletonItem style={styles.serviceChip} />
            <SkeletonItem style={styles.serviceChip} />
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  cardInner: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 4,
  },
  titleLine: {
    width: '80%',
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  distance: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  directionsButton: {
    width: 34,
    height: 34,
    borderRadius: 16,
    marginBottom: 8,
  },
  yakapBadge: {
    width: 50,
    height: 18,
    borderRadius: 6,
  },
  content: {
    marginTop: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  statusText: {
    width: 100,
    height: 14,
    borderRadius: 4,
  },
  addressLine: {
    width: '90%',
    height: 13,
    borderRadius: 4,
    marginBottom: 16,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceChip: {
    width: 70,
    height: 24,
    borderRadius: 12,
  },
});