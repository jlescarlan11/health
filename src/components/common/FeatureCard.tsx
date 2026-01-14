import React from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, View } from 'react-native';
import { Text, Surface, useTheme, Icon } from 'react-native-paper';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  style?: ViewStyle;
  color?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  style,
  color,
}) => {
  const theme = useTheme();
  const iconColor = color || theme.colors.primary;

  return (
    <Surface style={[styles.container, style]} elevation={2}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${subtitle}`}
        accessibilityHint={`Double tap to navigate to ${title}`}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
          <Icon source={icon} size={32} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <Icon source="chevron-right" size={24} color={theme.colors.onSurfaceDisabled} />
        </View>
      </TouchableOpacity>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});
