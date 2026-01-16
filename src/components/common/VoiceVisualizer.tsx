import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from 'react-native-paper';

interface VoiceVisualizerProps {
  volume: number; // Volume value from 0 to 10+ (depends on platform)
  isRecording: boolean;
  barCount?: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  volume,
  isRecording,
  barCount = 5,
}) => {
  const theme = useTheme();
  // We use multiple animated values for each bar
  const animations = useRef([...Array(barCount)].map(() => new Animated.Value(0.2))).current;

  useEffect(() => {
    if (!isRecording) {
      animations.forEach((anim) => {
        Animated.spring(anim, {
          toValue: 0.2,
          useNativeDriver: true,
          tension: 40,
          friction: 7,
        }).start();
      });
      return;
    }

    // Map volume to a scale (usually Voice returns 0-10 or 0-14)
    // We normalize it roughly for visualization
    const normalizedVolume = Math.min(Math.max(volume / 10, 0.2), 1.0);

    animations.forEach((anim) => {
      // Add some variation to the bars
      const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const targetScale = normalizedVolume * variation;

      Animated.timing(anim, {
        toValue: Math.max(0.2, targetScale),
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [volume, isRecording, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim) => (
        <Animated.View
          key={anim.toString()}
          style={[
            styles.bar,
            {
              backgroundColor: theme.colors.error,
              transform: [{ scaleY: anim }],
              height: 20, // Base height
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 30,
    width: 40,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});
