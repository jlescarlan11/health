import React from 'react';
import { Alert, StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility, FacilityService } from '../../types';
import { formatDistance } from '../../utils/locationUtils';
import { getOpenStatus } from '../../utils';
import { openExternalMaps } from '../../utils/linkingUtils';

interface FacilityCardProps {
  facility: Facility;
  onPress?: () => void;
  style?: ViewStyle;
  showDistance?: boolean;
  distance?: number;
  relevantServices?: FacilityService[];
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
  const { text: statusText, color: statusColor } = getOpenStatus(facility);

  const accessibilityLabel = `Facility: ${facility.name}, Type: ${facility.type}, Status: ${statusText}, Address: ${facility.address}${facility.yakapAccredited ? ', YAKAP Accredited' : ''}${showDistance && distance !== undefined ? `, Distance: ${formatDistance(distance)}` : ''}`;

  const handleDirectionsPress = async () => {
    const opened = await openExternalMaps({
      latitude: facility.latitude,
      longitude: facility.longitude,
      label: facility.name,
      address: facility.address,
    });

    if (!opened) {
      Alert.alert('Error', 'Failed to open maps for directions.');
    }
  };

  // Determine which services to show
  const displayServices = React.useMemo(() => {
    const allServices = [...facility.services, ...(facility.specialized_services || [])];

    if (showAllServices) return allServices;

    if (relevantServices && relevantServices.length > 0) {
      // Prioritize relevant services if they exist in facility services
      const relevant = allServices.filter((s) =>
        relevantServices.some((rs) => s.toLowerCase().includes(rs.toLowerCase())),
      );
      // Combine relevant with others, then slice
      const others = allServices.filter((s) => !relevant.includes(s));
      return [...relevant, ...others].slice(0, 3);
    }

    return allServices.slice(0, 3);
  }, [facility.services, facility.specialized_services, relevantServices, showAllServices]);

  const totalServicesCount =
    facility.services.length + (facility.specialized_services?.length || 0);
  const hasMoreServices = totalServicesCount > displayServices.length;

  const hasMatches = React.useMemo(() => {
    if (!relevantServices || relevantServices.length === 0) return false;
    const allServices = [...facility.services, ...(facility.specialized_services || [])];
    return relevantServices.some((rs) =>
      allServices.some((s) => s.toLowerCase().includes(rs.toLowerCase())),
    );
  }, [facility.services, facility.specialized_services, relevantServices]);

  return (
    <Card
      style={[
        styles.card,
        style,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        },
      ]}
      onPress={onPress}
      mode="contained"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialCommunityIcons
                name={facility.type === 'hospital' ? 'hospital-building' : 'home-plus'}
                size={20}
                color={theme.colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text variant="titleMedium" style={styles.title}>
                {facility.name}
              </Text>
            </View>
          </View>

          <View style={styles.rightHeader}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Directions to ${facility.name}`}
              accessibilityHint="Opens your maps app with directions"
              style={[styles.directionsButton, { backgroundColor: theme.colors.surfaceVariant }]}
              onPress={(e) => {
                e.stopPropagation();
                handleDirectionsPress();
              }}
            >
              <MaterialCommunityIcons name="directions" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            {facility.yakapAccredited && (
              <View
                style={[styles.yakapBadge, { backgroundColor: theme.colors.secondaryContainer }]}
              >
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={12}
                  color={theme.colors.onSecondaryContainer}
                />
                <Text style={[styles.yakapText, { color: theme.colors.onSecondaryContainer }]}>
                  YAKAP
                </Text>
              </View>
            )}
            {showDistance && distance !== undefined && (
              <View style={styles.distanceContainer}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={10}
                  color={theme.colors.outline}
                />
                <Text
                  variant="labelSmall"
                  style={[styles.distance, { color: theme.colors.outline }]}
                >
                  {formatDistance(distance)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {hasMatches && (
          <View style={[styles.matchBadge, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#2E7D32" />
            <Text style={[styles.matchText, { color: '#2E7D32' }]}>Matches Your Needs</Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text
              variant="labelMedium"
              style={{ color: statusColor, fontWeight: '700', letterSpacing: 0.3 }}
            >
              {statusText}
            </Text>
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
                  { backgroundColor: theme.colors.primaryContainer + '40' },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    getServiceIcon(service) as keyof (typeof MaterialCommunityIcons)['glyphMap']
                  }
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
                  style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 10 }}
                >
                  +{totalServicesCount - displayServices.length} MORE
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
    marginVertical: 8,
    borderRadius: 20,
    borderWidth: 0,
  },
  cardInner: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 26,
    letterSpacing: -0.2,
    flex: 1, // allow title to take available space
  },

  rightHeader: {
    alignItems: 'flex-end',
  },
  directionsButton: {
    padding: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  yakapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  yakapText: {
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  matchText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  content: {
    marginTop: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  address: {
    color: 'rgba(0,0,0,0.5)',
    marginBottom: 16,
    fontWeight: '600',
    fontSize: 13,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  moreServices: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
