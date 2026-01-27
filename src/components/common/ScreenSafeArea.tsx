import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

type ScreenSafeAreaProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  disableBottomInset?: boolean;
};

export const ScreenSafeArea = ({
  children,
  style,
  edges,
  disableBottomInset = false,
}: ScreenSafeAreaProps) => {
  const defaultEdges: Edge[] = ['top', 'left', 'right', 'bottom'];
  const requestedEdges = edges ?? defaultEdges;
  const safeEdges = disableBottomInset
    ? requestedEdges.filter((edge) => edge !== 'bottom')
    : requestedEdges;
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
