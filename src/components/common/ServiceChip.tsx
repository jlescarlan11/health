import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ServiceChipProps {
  service: string;
  transparent?: boolean;
}

export const getServiceIcon = (service: string): string => {
  const lowerService = service.toLowerCase();
  if (lowerService.includes('emergency')) return 'ambulance';
  if (lowerService.includes('dental')) return 'tooth';
  if (lowerService.includes('lab')) return 'flask';
  if (lowerService.includes('x-ray') || lowerService.includes('radiology')) return 'radiology-box';
  if (lowerService.includes('consultation')) return 'doctor';
  if (lowerService.includes('pharmacy') || lowerService.includes('drug')) return 'pill';
  if (lowerService.includes('vaccin')) return 'syringe';
  if (lowerService.includes('maternity') || lowerService.includes('birth')) return 'human-pregnant';
  if (lowerService.includes('pediatric')) return 'baby-face-outline';
  return 'medical-bag';
};

export const ServiceChip: React.FC<ServiceChipProps> = ({ service, transparent = false }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.serviceChip,
        { backgroundColor: theme.colors.primaryContainer + (transparent ? '40' : '') },
      ]}
    >
      <MaterialCommunityIcons
        name={getServiceIcon(service) as keyof (typeof MaterialCommunityIcons)['glyphMap']}
        size={12}
        color={theme.colors.primary}
      />
      <Text
        variant="labelSmall"
        style={[styles.serviceText, { color: theme.colors.onPrimaryContainer }]}
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
    marginLeft: 6,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
