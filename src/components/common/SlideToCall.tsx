import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated, StyleProp, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SlideToCallProps {
  onSwipeComplete: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
}

export const SlideToCall: React.FC<SlideToCallProps> = ({
  onSwipeComplete,
  containerStyle,
  label = 'Slide to Call Emergency',
}) => {
  const theme = useTheme();
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      // CRITICAL FIX: Changed from false to true to work in Modals
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detect horizontal swipe to avoid interfering with vertical scrolling
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
        );
      },
      onMoveShouldSetPanResponderCapture: () => false,

      // CRITICAL FIX: Prevent Modal from terminating the gesture
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        // Touch started - we can add haptic feedback here if needed
      },

      onPanResponderMove: (_, gestureState) => {
        const PULL_LIMIT = 50; // Controlled visual distance
        const resistance = 0.3; // Lower resistance for a 'heavier' feel

        if (gestureState.dx > 0) {
          // Moves slightly with resistance, capped at PULL_LIMIT
          const moveX = Math.min(gestureState.dx * resistance, PULL_LIMIT);
          pan.setValue(moveX);
        } else {
          pan.setValue(0);
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        const TRIGGER_THRESHOLD = 100; // Drag distance required to trigger

        if (gestureState.dx >= TRIGGER_THRESHOLD) {
          onSwipeComplete();
        }

        // Always smoothly animate back to original position upon release
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      },

      onPanResponderTerminate: () => {
        // Spring back if gesture is interrupted
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.error }, containerStyle]}>
      <View
        style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
        {...panResponder.panHandlers}
      >
        <Text style={[styles.text, { color: theme.colors.onError }]}>{label}</Text>
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ translateX: pan }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chevron-double-right"
            size={28}
            color={theme.colors.error}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 58,
    borderRadius: 29,
    padding: 4,
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  text: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    zIndex: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
