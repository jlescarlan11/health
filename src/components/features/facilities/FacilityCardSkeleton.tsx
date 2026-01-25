import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
}

const SkeletonItem = ({ style }: { style: StyleProp<ViewStyle> }) => {
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
        {/* Header Row */}
        <SkeletonItem style={styles.titleLine} />

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <SkeletonItem style={styles.metaText} />
          <SkeletonItem style={[styles.metaText, { width: 80, marginLeft: 12 }]} />
          <SkeletonItem style={[styles.metaText, { width: 80, marginLeft: 12 }]} />
          <SkeletonItem style={[styles.matchBadge, { marginLeft: 12 }]} />
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          <SkeletonItem style={styles.statusIcon} />
          <SkeletonItem style={styles.statusText} />
        </View>

        {/* Services Row */}
        <View style={styles.servicesRow}>
          <SkeletonItem style={styles.serviceChip} />
          <SkeletonItem style={styles.serviceChip} />
          <SkeletonItem style={styles.serviceChip} />
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <SkeletonItem style={styles.actionButton} />
          <SkeletonItem style={styles.actionButton} />
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
  titleLine: {
    width: '70%',
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  matchBadge: {
    width: 70,
    height: 18,
    borderRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  serviceChip: {
    width: 70,
    height: 24,
    borderRadius: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
  },
});
