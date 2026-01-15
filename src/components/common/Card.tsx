import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card as PaperCard, Text, useTheme } from 'react-native-paper';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  title?: string;
  subtitle?: string;
  mode?: 'elevated' | 'outlined' | 'contained';
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  rippleColor?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  title,
  subtitle,
  mode = 'elevated',
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  rippleColor,
}) => {
  const theme = useTheme();

  return (
    <PaperCard
      style={[styles.card, style]}
      onPress={onPress}
      mode={mode}
      accessible={true}
      accessibilityRole={accessibilityRole || (onPress ? 'button' : 'none')}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...(onPress && rippleColor ? { rippleColor } : {})}
    >
      {(title || subtitle) && (
        <PaperCard.Title
          title={title}
          subtitle={subtitle}
          titleStyle={styles.title}
          subtitleStyle={styles.subtitle}
        />
      )}
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: -4,
  },
});
