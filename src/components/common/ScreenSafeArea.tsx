import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

type ScreenSafeAreaProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

export const ScreenSafeArea = ({ children, style, edges }: ScreenSafeAreaProps) => {
  const safeEdges = edges ?? ['top', 'left', 'right', 'bottom'];
  return (
    <SafeAreaView edges={safeEdges} style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
