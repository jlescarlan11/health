import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FacilityBusyness } from '../../types';

interface BusynessIndicatorProps {
  busyness?: FacilityBusyness;
  showSeparator?: boolean;
  isVisible?: boolean;
}

export const BusynessIndicator: React.FC<BusynessIndicatorProps> = ({
  busyness,
  showSeparator = true,
  isVisible = true,
}) => {
  if (!isVisible || !busyness || !busyness.status) return null;

  const getBusynessConfig = (status: string) => {
    switch (status) {
      case 'quiet':
        return { label: 'Quiet Now', color: '#379777', icon: 'account-outline' };
      case 'moderate':
        return { label: 'Moderate', color: '#F4CE14', icon: 'account-group-outline' };
      case 'busy':
        return { label: 'Busy', color: '#F97316', icon: 'account-multiple' };
      default:
        return null;
    }
  };

  const config = getBusynessConfig(busyness.status);
  if (!config) return null;

  return (
    <View style={styles.container}>
      {showSeparator && (
        <Text variant="labelSmall" style={styles.separator}>
          •
        </Text>
      )}
      <MaterialCommunityIcons
        name={config.icon as any}
        size={14}
        color={config.color}
        style={{ marginRight: 4 }}
      />
      <Text
        variant="labelMedium"
        style={{ color: config.color, fontWeight: '700', letterSpacing: 0.3 }}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    marginHorizontal: 6,
    color: '#94A3B8',
  },
});
