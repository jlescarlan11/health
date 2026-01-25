import React from 'react';
import { Alert, StyleSheet, View, ViewStyle, TouchableOpacity, Linking } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility, FacilityService } from '../../types';
import { formatDistance } from '../../utils/locationUtils';
import { getOpenStatus, formatFacilityType } from '../../utils';
import { openExternalMaps } from '../../utils/linkingUtils';
import { Button } from './Button';

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
  const { text: statusText, color: statusColor, isOpen } = getOpenStatus(facility);

  const hasMatches = React.useMemo(() => {
    if (!relevantServices || relevantServices.length === 0) return false;
    const allServices = [...facility.services, ...(facility.specialized_services || [])];
    return relevantServices.some((rs) =>
      allServices.some((s) => s.toLowerCase().includes(rs.toLowerCase())),
    );
  }, [facility.services, facility.specialized_services, relevantServices]);

  const accessibilityLabel = `Facility: ${facility.name}, Type: ${
    facility.type
  }, Status: ${statusText}${facility.yakapAccredited ? ', YAKAP Accredited' : ''}${
    hasMatches ? ', Matches Your Needs' : ''
  }${
    showDistance
      ? `, Distance: ${
          typeof distance === 'number' && !isNaN(distance) ? formatDistance(distance) : 'unavailable'
        }`
      : ''
  }`;

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

  const handleCallPress = () => {
    if (facility.phone) {
      Linking.openURL(`tel:${facility.phone}`).catch(() =>
        Alert.alert('Error', 'Failed to open dialer.'),
      );
    } else {
      Alert.alert('Not Available', 'Phone number is not available.');
    }
  };

  // Determine which services to show
  const displayServices = React.useMemo(() => {
    const allServices = [...facility.services, ...(facility.specialized_services || [])];

    // In simplified/list view, we strictly limit to 3 and ignore showAllServices
    if (simplified) {
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
    }

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
  }, [facility.services, facility.specialized_services, relevantServices, showAllServices, simplified]);

  const totalServicesCount =
    facility.services.length + (facility.specialized_services?.length || 0);
  const hasMoreServices = totalServicesCount > displayServices.length;

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
        {/* Header Row */}
        <Text variant="titleMedium" style={styles.title}>
          {facility.name}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <Text variant="labelSmall" style={styles.metaText}>
            {formatFacilityType(facility.type)}
          </Text>

          {facility.yakapAccredited && (
            <Text variant="labelSmall" style={styles.metaText}>
              Yakap Accredited
            </Text>
          )}

          {showDistance && (
            <Text variant="labelSmall" style={styles.metaText}>
              {typeof distance === 'number' && !isNaN(distance)
                ? formatDistance(distance)
                : 'Distance unavailable'}
            </Text>
          )}

          {hasMatches && (
            <View style={[styles.matchBadge, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#2E7D32" />
              <Text style={[styles.matchText, { color: '#2E7D32' }]}>Matches Needs</Text>
            </View>
          )}
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name={isOpen ? 'clock-check-outline' : 'clock-alert-outline'}
            size={14}
            color={statusColor}
            style={{ marginRight: 6 }}
          />
          <Text
            variant="labelMedium"
            style={{ color: statusColor, fontWeight: '700', letterSpacing: 0.3 }}
          >
            {statusText}
          </Text>
        </View>

        {/* Services Row */}
        <View style={styles.servicesRow}>
          {displayServices.map((service, index) => (
            <View
              key={index}
              style={[styles.serviceChip, { backgroundColor: theme.colors.primaryContainer + '40' }]}
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
          ))}
          {hasMoreServices && !showAllServices && !simplified && (
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

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <Button
            title="Call"
            icon="phone"
            variant="primary"
            onPress={handleCallPress}
            style={styles.actionButton}
            disabled={!facility.phone}
          />
          <Button
            title="Directions"
            icon="directions"
            variant="primary"
            onPress={handleDirectionsPress}
            style={styles.actionButton}
          />
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 26,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchText: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginVertical: 0,
    minHeight: 40,
  },
});