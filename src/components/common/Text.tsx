import React from 'react';
import { Text as PaperText, TextProps } from 'react-native-paper';
import { StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useAdaptiveUI } from '../../hooks/useAdaptiveUI';

/**
 * A wrapper around React Native Paper's Text component that automatically
 * applies a global scale factor for Senior/Adaptive UI modes.
 */
export const Text: React.FC<TextProps> = ({ style, children, ...props }) => {
  const { scaleFactor } = useAdaptiveUI();

  // If scaleFactor is 1.0, just render the original component
  if (scaleFactor === 1.0) {
    return (
      <PaperText style={style} {...props}>
        {children}
      </PaperText>
    );
  }

  // Flatten and scale the style
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle;
  const scaledStyle: TextStyle = { ...flattenedStyle };

  if (scaledStyle.fontSize) {
    scaledStyle.fontSize *= scaleFactor;
  }

  if (scaledStyle.lineHeight) {
    scaledStyle.lineHeight *= scaleFactor;
  }

  return (
    <PaperText style={scaledStyle} {...props}>
      {children}
    </PaperText>
  );
};
