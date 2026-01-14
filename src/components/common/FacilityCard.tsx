import React from 'react';
import { StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
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
  relevantServices?: string[];
  simplified?: boolean;
}

const getServiceIcon = (service: string): string => {
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

const formatFacilityType = (type: string): string => {
  if (!type) return '';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const FacilityCard: React.FC<FacilityCardProps> = ({
  facility,
  onPress,
  style,
  showDistance = false,
  distance,
  relevantServices,
  simplified = false,
}) => {
  const theme = useTheme();
  const [showAllServices, setShowAllServices] = React.useState(false);
  const { isOpen, text: statusText, color: statusColor } = getOpenStatus(facility);

  const accessibilityLabel = `Facility: ${facility.name}, Type: ${facility.type}, Status: ${statusText}, Address: ${facility.address}${facility.yakapAccredited ? ', YAKAP Accredited' : ''}${showDistance && distance !== undefined ? `, Distance: ${formatDistance(distance)}` : ''}`;

  // Determine which services to show
  const displayServices = React.useMemo(() => {
    if (showAllServices) return facility.services;

    if (relevantServices && relevantServices.length > 0) {
      // Prioritize relevant services if they exist in facility services
      const relevant = facility.services.filter((s) =>
        relevantServices.some((rs) => s.toLowerCase().includes(rs.toLowerCase())),
      );
      if (relevant.length > 0) return relevant.slice(0, 3);
    }

    return simplified ? facility.services.slice(0, 3) : facility.services.slice(0, 4);
  }, [facility.services, relevantServices, simplified, showAllServices]);

  const hasMoreServices = facility.services.length > displayServices.length;

  return (
    <Card
      style={[styles.card, style, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      mode="outlined"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text variant="titleMedium" style={styles.title}>
              {facility.name}
            </Text>
            <Text variant="labelSmall" style={[styles.typeText, { color: theme.colors.primary }]}>
              {formatFacilityType(facility.type)}
            </Text>
          </View>

          <View style={styles.rightHeader}>
            {facility.yakapAccredited && (
              <View
                style={[styles.yakapBadge, { backgroundColor: theme.colors.secondaryContainer }]}
              >
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={14}
                  color={theme.colors.onSecondaryContainer}
                />
                <Text style={[styles.yakapText, { color: theme.colors.onSecondaryContainer }]}>
                  YAKAP
                </Text>
              </View>
            )}
            {showDistance && distance !== undefined && (
              <Text variant="labelSmall" style={[styles.distance, { color: theme.colors.outline }]}>
                {formatDistance(distance)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.statusRow}>
            <Text variant="labelMedium" style={{ color: statusColor, fontWeight: '800' }}>
              {statusText}
            </Text>
            {facility.hours && !facility.hours.includes('24/7') && (
              <Text
                variant="labelSmall"
                style={{ marginLeft: 8, color: 'rgba(0,0,0,0.4)', fontWeight: '500' }}
              >
                {facility.hours}
              </Text>
            )}
          </View>

          <Text variant="bodySmall" numberOfLines={1} style={styles.address}>
            {facility.address}
          </Text>

          <View style={styles.servicesRow}>
            {displayServices.map((service, index) => (
              <View
                key={index}
                style={[
                  styles.serviceChip,
                  { backgroundColor: theme.colors.primaryContainer + '50' },
                ]}
              >
                <MaterialCommunityIcons
                  name={getServiceIcon(service) as any}
                  size={14}
                  color={theme.colors.primary}
                />
                <Text
                  variant="labelSmall"
                  style={[styles.serviceText, { color: theme.colors.onPrimaryContainer }]}
                >
                  {service}
                </Text>
              </View>
            ))}
            {hasMoreServices && !showAllServices && (
              <TouchableOpacity
                style={styles.moreServices}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowAllServices(true);
                }}
              >
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.primary, fontWeight: 'bold' }}
                >
                  +{facility.services.length - displayServices.length} more
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardInner: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: '800',
    color: 'rgba(0,0,0,0.8)',
    marginBottom: 2,
  },
  typeText: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'none',
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  yakapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  yakapText: {
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  distance: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    marginTop: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  address: {
    color: 'rgba(0,0,0,0.5)',
    marginBottom: 12,
    fontWeight: '500',
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  serviceText: {
    fontSize: 11,
    marginLeft: 6,
    fontWeight: '600',
  },
  moreServices: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
