import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
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
  const [trackWidth, setTrackWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,

        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
          );
        },
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => false,

        onPanResponderMove: (_, gestureState) => {
          if (!trackWidth) return;
          const MAX_VISUAL_DRAG = 60; // Revert to a short, controlled pull distance
          const resistance = 0.4; // Slightly more responsive than original but still heavy

          if (gestureState.dx > 0) {
            const moveX = Math.min(gestureState.dx * resistance, MAX_VISUAL_DRAG);
            pan.setValue(moveX);
          } else {
            pan.setValue(0);
          }
        },

        onPanResponderRelease: (_, gestureState) => {
          if (!trackWidth) return;
          const GESTURE_THRESHOLD = 100; // Intent threshold

          if (gestureState.dx >= GESTURE_THRESHOLD) {
            // RELEASE SNAP-BACK SEQUENCE: Just return to start (<<<) then call
            Animated.timing(pan, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                onSwipeComplete();
              }
            });
          } else {
            // Smoothly animate back if threshold not met
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }).start();
          }
        },

        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [trackWidth, pan, onSwipeComplete],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.error }, containerStyle]}>
      <View
        style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
        onLayout={onLayout}
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
    justifyContent: 'center',
    // Subtle shadow/elevation
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  track: {
    flex: 1,
    borderRadius: 29,
    paddingHorizontal: 4,
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
    fontSize: 16,
    fontWeight: 'bold',
    zIndex: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
