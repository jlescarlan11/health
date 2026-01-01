import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility } from '../../types';
import { formatDistance } from '../../utils/locationUtils';
import { getOpenStatus } from '../../utils';

interface FacilityCardProps {
  facility: Facility;
  onPress?: () => void;
  style?: ViewStyle;
  showDistance?: boolean;
  distance?: number;
}

const getServiceIcon = (service: string): string => {
  const lowerService = service.toLowerCase();
  if (lowerService.includes('emergency')) return 'ambulance';
  if (lowerService.includes('dental')) return 'tooth';
  if (lowerService.includes('lab')) return 'flask';
  if (lowerService.includes('x-ray') || lowerService.includes('radiology')) return 'radiology-box';
  if (lowerService.includes('consultation')) return 'doctor';
  if (lowerService.includes('pharmacy') || lowerService.includes('drug')) return 'pill';
  if (lowerService.includes('vaccin')) return 'needle';
  if (lowerService.includes('maternity') || lowerService.includes('birth')) return 'mother-nurse';
  if (lowerService.includes('pediatric')) return 'baby-face-outline';
  return 'medical-bag';
};

export const FacilityCard: React.FC<FacilityCardProps> = ({
  facility,
  onPress,
  style,
  showDistance = false,
  distance,
}) => {
  const theme = useTheme();
  const { isOpen, text: statusText, color: statusColor } = getOpenStatus(facility);

  const accessibilityLabel = `Facility: ${facility.name}, Type: ${facility.type}, Status: ${statusText}, Address: ${facility.address}${facility.yakapAccredited ? ', YAKAP Accredited' : ''}${showDistance && distance !== undefined ? `, Distance: ${formatDistance(distance)}` : ''}`;

  return (
    <Card 
      style={[styles.card, style]} 
      onPress={onPress} 
      mode="elevated"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view facility details"
    >
      <Card.Title
        title={facility.name}
        subtitle={facility.type}
        titleStyle={styles.title}
        right={(props) => (
          <View style={styles.rightContainer}>
            {facility.yakapAccredited && (
              <Chip
                icon="check-decagram"
                style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
                textStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 10, marginVertical: 0 }}
                compact
              >
                YAKAP
              </Chip>
            )}
            {showDistance && distance !== undefined && (
              <Text variant="labelSmall" style={[styles.distance, { color: theme.colors.outline }]}>
                {formatDistance(distance)}
              </Text>
            )}
          </View>
        )}
      />
      <Card.Content>
        <View style={styles.infoRow}>
            <Text variant="labelMedium" style={{ color: statusColor, fontWeight: 'bold' }}>
              {statusText}
            </Text>
            {facility.hours && !facility.hours.includes('24/7') && (
               <Text variant="labelSmall" style={{ marginLeft: 8, color: theme.colors.outline }}>
                 {facility.hours}
               </Text>
            )}
        </View>

        <Text variant="bodyMedium" style={styles.address}>
          {facility.address}
        </Text>
        
        <View style={styles.servicesContainer}>
          {facility.services.slice(0, 4).map((service, index) => (
            <View key={index} style={styles.serviceIconContainer}>
               <MaterialCommunityIcons 
                 name={getServiceIcon(service) as any} 
                 size={20} 
                 color={theme.colors.primary} 
               />
               <Text variant="labelSmall" style={styles.serviceText} numberOfLines={1}>
                 {service}
               </Text>
            </View>
          ))}
          {facility.services.length > 4 && (
             <View style={styles.moreServices}>
                <Text variant="labelSmall">+{facility.services.length - 4}</Text>
             </View>
          )}
        </View>
      </Card.Content>
    </Card>
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
  chip: {
    marginRight: 0,
    marginBottom: 4,
  },
  rightContainer: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  distance: {
    marginTop: 2,
  },
  address: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicesContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  serviceIconContainer: {
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
    width: 60, 
  },
  serviceText: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  moreServices: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 24,
  },
});
