import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface ServiceChipProps {
  service: string;
  transparent?: boolean;
}

export const ServiceChip: React.FC<ServiceChipProps> = ({ service, transparent = false }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.serviceChip,
        { backgroundColor: transparent ? theme.colors.primaryContainer : '#D1E7DD' },
      ]}
    >
      <Text
        variant="labelSmall"
        style={[styles.serviceText, { color: '#164032' }]} // Deep green for high contrast
      >
        {service}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serviceText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
