import React from 'react';
import { Alert, StyleSheet, View, ViewStyle, TouchableOpacity, Linking, Modal, FlatList } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility, FacilityService, FacilityBusyness } from '../../types';
import { formatDistance } from '../../utils/locationUtils';
import { getOpenStatus, formatFacilityType } from '../../utils';
import { openExternalMaps } from '../../utils/linkingUtils';
import { Button } from './Button';
import { BusynessIndicator } from './BusynessIndicator';
import { ServiceChip } from './ServiceChip';

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
  const [showAllServices, setShowAllServices] = React.useState(false);
  const [contactsModalVisible, setContactsModalVisible] = React.useState(false);
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

  const handleCallPress = () => {
    const hasMultipleContacts = facility.contacts && facility.contacts.length > 1;

    if (hasMultipleContacts) {
      setContactsModalVisible(true);
      return;
    }

    const numberToCall =
      facility.contacts && facility.contacts.length > 0
        ? facility.contacts[0].phoneNumber
        : facility.phone;

    if (numberToCall) {
      Linking.openURL(`tel:${numberToCall}`).catch(() =>
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
  }, [
    facility.services,
    facility.specialized_services,
    relevantServices,
    showAllServices,
    simplified,
  ]);

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
              style={{ color: statusColor, fontWeight: '700', letterSpacing: 0.3 }}
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
            disabled={!facility.phone && (!facility.contacts || facility.contacts.length === 0)}
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

      {/* Contact Selection Modal */}
      <Modal
        visible={contactsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setContactsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContactsModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Select Number
            </Text>
            <FlatList
              data={facility.contacts}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactOption}
                  activeOpacity={0.6}
                  onPress={() => {
                    setContactsModalVisible(false);
                    Linking.openURL(`tel:${item.phoneNumber}`);
                  }}
                >
                  <View style={styles.contactOptionContent}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                      <MaterialCommunityIcons name="phone" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contactNumber, { color: theme.colors.primary }]}>
                        {item.phoneNumber}
                      </Text>
                      {item.role && (
                        <Text style={[styles.contactRole, { color: theme.colors.onSurfaceVariant }]}>
                          {item.role} {item.contactName ? `• ${item.contactName}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              onPress={() => setContactsModalVisible(false)} 
              style={{ marginTop: 16, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.onSurface }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginVertical: 0,
    minHeight: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: '100%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6', // Subtle tint
    borderRadius: 12,
    marginVertical: 6,
  },
  contactOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 14,
  },
});
