import React from 'react';
import {
  Alert,
  StyleSheet,
  View,
  ViewStyle,
  TouchableOpacity,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility, FacilityService, FacilityBusyness } from '../../types';
import { formatDistance } from '../../utils/locationUtils';
import { getOpenStatus, formatFacilityType } from '../../utils';
import { openExternalMaps } from '../../utils/linkingUtils';
import { BusynessIndicator } from './BusynessIndicator';
import { ServiceChip } from './ServiceChip';
import { TeleconsultBadge } from './TeleconsultBadge';
import { useAdaptiveUI } from '../../hooks/useAdaptiveUI';
import { sharingUtils } from '../../utils/sharingUtils';
import { IconButton } from 'react-native-paper';
import { Text } from './Text';
import { FacilityActionButtons } from './FacilityActionButtons';

interface FacilityCardProps {
  facility: Facility;
  onPress?: () => void;
  style?: ViewStyle;
  showDistance?: boolean;
  distance?: number;
  relevantServices?: FacilityService[];
  simplified?: boolean;
}

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
  const { scaleFactor } = useAdaptiveUI();
  const { text: statusText, color: statusColor, isOpen } = getOpenStatus(facility);
  const [showAllServices, setShowAllServices] = React.useState(false);

  const hasMatches = React.useMemo(() => {
    if (!relevantServices || relevantServices.length === 0) return false;
    const allServices = [...(facility.services || []), ...(facility.specialized_services || [])];
    return relevantServices.some((rs) =>
      allServices.some((s) => s.toLowerCase().includes(rs.toLowerCase())),
    );
  }, [facility.services, facility.specialized_services, relevantServices]);

  const hasTeleconsult = React.useMemo(() => {
    return facility.contacts?.some((c) => !!c.teleconsultUrl);
  }, [facility.contacts]);

  const accessibilityLabel = `Facility: ${facility.name}, Type: ${
    facility.type
  }, Status: ${statusText}${facility.yakapAccredited ? ', YAKAP Accredited' : ''}${
    hasMatches ? ', Matches Your Needs' : ''
  }${
    showDistance
      ? `, Distance: ${
          typeof distance === 'number' && !isNaN(distance)
            ? formatDistance(distance)
            : 'unavailable'
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

  // Determine which services to show
  const displayServices = React.useMemo(() => {
    const allServices = [...(facility.services || []), ...(facility.specialized_services || [])];

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
  }, [
    facility.services,
    facility.specialized_services,
    relevantServices,
    showAllServices,
    simplified,
  ]);

  const totalServicesCount =
    (facility.services?.length || 0) + (facility.specialized_services?.length || 0);
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
        <View style={styles.titleRow}>
          <Text variant="titleMedium" style={styles.title}>
            {facility.name}
          </Text>
          <IconButton
            icon="share-variant-outline"
            size={20 * scaleFactor}
            onPress={(e) => {
              e.stopPropagation();
              sharingUtils.shareFacilityInfo(facility);
            }}
            style={styles.shareIconButton}
            iconColor={theme.colors.primary}
            accessibilityLabel={`Share ${facility.name} info`}
          />
        </View>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          {[
            formatFacilityType(facility.type),
            facility.yakapAccredited ? 'YAKAP Accredited' : null,
            showDistance
              ? typeof distance === 'number' && !isNaN(distance)
                ? `${formatDistance(distance)}`
                : 'Distance unavailable'
              : null,
          ]
            .filter(Boolean)
            .map((item, index, array) => (
              <React.Fragment key={index}>
                <Text variant="labelSmall" style={styles.metaText}>
                  {item}
                </Text>
                {index < array.length - 1 && (
                  <Text variant="labelSmall" style={[styles.metaText, styles.metaSeparator]}>
                    •
                  </Text>
                )}
              </React.Fragment>
            ))}

          {hasMatches && (
            <View style={[styles.matchBadge, { backgroundColor: '#E8F5E9', marginLeft: 4 }]}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#2E7D32" />
              <Text style={[styles.matchText, { color: '#2E7D32' }]}>Matches Needs</Text>
            </View>
          )}

          {hasTeleconsult && <TeleconsultBadge style={{ marginLeft: 4, marginTop: 2 }} />}
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons
              name={isOpen ? 'clock-check-outline' : 'clock-alert-outline'}
              size={14}
              color={statusColor}
              style={{ marginRight: 6 }}
            />
            <Text
              variant="labelMedium"
              style={{
                color: statusColor,
                fontWeight: '700',
                letterSpacing: 0.3,
              }}
            >
              {statusText}
            </Text>
          </View>
          <BusynessIndicator busyness={facility.busyness} isVisible={isOpen} />
        </View>

        {/* Services Row */}
        <View style={styles.servicesRow}>
          {displayServices.map((service, index) => (
            <ServiceChip key={index} service={service} transparent />
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
                style={{
                  color: theme.colors.primary,
                  fontWeight: '800',
                }}
              >
                +{totalServicesCount - displayServices.length} MORE
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons Row */}
        <FacilityActionButtons
          contacts={facility.contacts}
          primaryPhone={facility.phone}
          onDirectionsPress={handleDirectionsPress}
          containerStyle={styles.actionsRow}
        />
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 26,
    letterSpacing: -0.2,
    flex: 1,
  },
  shareIconButton: {
    margin: 0,
    marginTop: -4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metaSeparator: {
    marginHorizontal: 6,
    color: '#94A3B8',
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
  moreServices: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  actionsRow: {
    marginTop: 8,
  },
});
