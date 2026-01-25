import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Share,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing';

import { RootStackScreenProps } from '../types/navigation';
import { RootState } from '../store';
import { Button } from '../components/common/Button';
import { BusynessIndicator } from '../components/common/BusynessIndicator';
import StandardHeader from '../components/common/StandardHeader';
import { calculateDistance, formatDistance } from '../utils/locationUtils';
import { getOpenStatus, formatOperatingHours } from '../utils/facilityUtils';
import { formatFacilityType } from '../utils';
import { useTheme, Text as PaperText } from 'react-native-paper';
import { useUserLocation } from '../hooks';
import { openExternalMaps } from '../utils/linkingUtils';
import { ServiceChip } from '../components/common/ServiceChip';

type FacilityDetailsRouteProp = RootStackScreenProps<'FacilityDetails'>['route'];

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 250;

const CATEGORIES = {
  'Primary Care': [
    'Consultation',
    'General Medicine',
    'Pediatrics',
    'Internal Medicine',
    'Family Planning',
    'Immunization',
    'Nutrition Services',
    'Maternal Care',
    'Adolescent Health',
    'Dental',
    'Primary Care',
  ],
  'Emergency & Urgent Care': ['Emergency', 'Trauma Care', 'Animal Bite Clinic'],
  'Specialized Services': [
    'OB-GYN',
    'ENT',
    'Dermatology',
    'Surgery',
    'Mental Health',
    'Dialysis',
    'Eye Center',
    'Stroke Unit',
    'HIV Treatment',
  ],
  'Diagnostics & Support': [
    'Laboratory',
    'Radiology',
    'X-ray',
    'Clinical Chemistry',
    'Clinical Microscopy',
    'Hematology',
    'Blood Bank',
    'ECG',
  ],
};

export const FacilityDetailsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<FacilityDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { facilityId } = route.params || { facilityId: '' };

  const facility = useSelector((state: RootState) =>
    state.facilities.facilities.find((f) => f.id === facilityId),
  );

  const { location } = useUserLocation();
  const reduxLocation = useSelector((state: RootState) => state.facilities.userLocation);

  const userLat = location?.coords.latitude || reduxLocation?.latitude;
  const userLon = location?.coords.longitude || reduxLocation?.longitude;

  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [contactsModalVisible, setContactsModalVisible] = useState(false);

  const distance = useMemo(() => {
    if (!facility || !userLat || !userLon) return null;
    return calculateDistance(userLat, userLon, facility.latitude, facility.longitude);
  }, [facility, userLat, userLon]);

  const groupedServices = useMemo(() => {
    if (!facility) return {};

    const grouped: Record<string, string[]> = {};
    const allServices = [...facility.services];

    // Add specialized_services to Specialized Services category if they exist
    if (facility.specialized_services) {
      facility.specialized_services.forEach((s) => {
        if (!allServices.includes(s as any)) {
          allServices.push(s as any);
        }
      });
    }

    Object.entries(CATEGORIES).forEach(([category, services]) => {
      const found = allServices.filter((s) => services.includes(s));
      if (found.length > 0) {
        grouped[category] = found;
      }
    });

    // Catch any remaining services
    const categorizedServices = Object.values(CATEGORIES).flat();
    const uncategorized = allServices.filter((s) => !categorizedServices.includes(s));

    if (uncategorized.length > 0) {
      grouped['Other Services'] = uncategorized;
    }

    return grouped;
  }, [facility]);

  if (!facility) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <StandardHeader title="Details" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>
            Facility not found.
          </Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const images = facility.photoUrl ? [{ uri: facility.photoUrl }] : [];

  const handleCall = () => {
    const hasMultipleContacts = facility.contacts && facility.contacts.length > 1;
    
    if (hasMultipleContacts) {
      setContactsModalVisible(true);
      return;
    }

    const numberToCall = (facility.contacts && facility.contacts.length > 0) 
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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${facility.name}\nAddress: ${facility.address}`,
        title: `Check out ${facility.name}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to share.');
    }
  };

  const handleDirections = async () => {
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

  const { text: openStatusText, color: openStatusColor, isOpen } = getOpenStatus(facility);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader
        title={facility.name}
        showBackButton
        rightActions={
          <TouchableOpacity
            onPress={handleShare}
            style={styles.headerShareButton}
            testID="header-share-button"
          >
            <Ionicons name="share-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Gallery */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => images.length > 0 && setImageViewerVisible(true)}
        >
          <Image
            source={images.length > 0 ? { uri: images[0].uri } : require('../../assets/icon.png')}
            style={[styles.headerImage, { backgroundColor: theme.colors.surfaceVariant }]}
            resizeMode="cover"
          />
          {images.length > 0 && (
            <View style={styles.galleryIndicator}>
              <Ionicons name="images-outline" size={16} color="#fff" />
              <Text style={styles.galleryText}>View Photos</Text>
            </View>
          )}
        </TouchableOpacity>

        {images.length > 0 && (
          <ImageViewing
            images={images}
            imageIndex={0}
            visible={isImageViewerVisible}
            onRequestClose={() => setImageViewerVisible(false)}
          />
        )}

        <View style={styles.contentContainer}>
          {/* Header Info */}
          <View style={styles.headerSection}>
            <Text style={[styles.facilityName, { color: theme.colors.onSurface }]}>
              {facility.name}
            </Text>

            <View style={styles.metaRow}>
              {[
                formatFacilityType(facility.type),
                facility.yakapAccredited ? 'YAKAP Accredited' : null,
                typeof distance === 'number' && !isNaN(distance)
                  ? `${formatDistance(distance)}`
                  : null,
              ]
                .filter(Boolean)
                .map((item, index, array) => (
                  <React.Fragment key={index}>
                    <Text style={styles.metaItem}>{item}</Text>
                    {index < array.length - 1 && <Text style={styles.metaSeparator}>•</Text>}
                  </React.Fragment>
                ))}
            </View>

            <View style={styles.statusRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name={isOpen ? 'clock-check-outline' : 'clock-alert-outline'}
                  size={14}
                  color={openStatusColor}
                  style={{ marginRight: 6 }}
                />
                <PaperText
                  variant="labelMedium"
                  style={{ color: openStatusColor, fontWeight: '700', letterSpacing: 0.3 }}
                >
                  {openStatusText}
                </PaperText>
              </View>
              <BusynessIndicator busyness={facility.busyness} isVisible={isOpen} />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionButtons}>
            <Button
              icon="phone"
              title="Call"
              onPress={handleCall}
              style={styles.actionButton}
              variant="primary"
              disabled={!facility.phone}
            />
            <Button
              icon="directions"
              title="Directions"
              onPress={handleDirections}
              style={styles.actionButton}
              variant="primary"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {/* Location */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>Address</Text>
              <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
                {facility.address}
              </Text>
            </View>
          </View>

          {/* Hours */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                Operating Hours
              </Text>

              {formatOperatingHours(facility).map((line, idx) => (
                <Text key={idx} style={[styles.infoText, { color: theme.colors.onSurface }]}>
                  {line}
                </Text>
              ))}
            </View>
          </View>

          {/* Phone */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="call-outline"
                size={24}
                color={(facility.contacts?.length || facility.phone) ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>Phone</Text>
              
              {facility.contacts && facility.contacts.length > 0 ? (
                facility.contacts.map((contact, index) => (
                  <TouchableOpacity
                    key={contact.id || index}
                    onPress={() => Linking.openURL(`tel:${contact.phoneNumber}`)}
                    style={{ marginBottom: 8 }}
                  >
                    <Text
                      style={[
                        styles.infoText,
                        styles.linkText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {contact.phoneNumber}
                    </Text>
                    {contact.role && (
                      <Text style={[styles.metaItem, { fontSize: 14 }]}>
                        {contact.role} {contact.contactName ? `• ${contact.contactName}` : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity
                  onPress={handleCall}
                  disabled={!facility.phone}
                >
                  <Text
                    style={[
                      styles.infoText,
                      styles.linkText,
                      { color: facility.phone ? theme.colors.primary : theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {facility.phone || 'Not available'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {/* Grouped Services */}
          <View style={styles.servicesSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Services & Capabilities
            </Text>

            {Object.entries(groupedServices).map(([category, services]) => (
              <View key={category} style={styles.categoryContainer}>
                <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
                  {category}
                </Text>
                <View style={styles.servicesGrid}>
                  {services.map((service, index) => (
                    <ServiceChip key={index} service={service} />
                  ))}
                </View>
              </View>
            ))}
          </View>

          {facility.lastUpdated && (
            <View style={styles.verificationContainer}>
              <Text style={[styles.verificationText, { color: theme.colors.outline }]}>
                Data verified as of {new Date(facility.lastUpdated).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Select Number</Text>
            <FlatList
              data={facility.contacts}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.contactOption, { borderBottomColor: theme.colors.outlineVariant }]}
                  onPress={() => {
                    setContactsModalVisible(false);
                    Linking.openURL(`tel:${item.phoneNumber}`);
                  }}
                >
                  <View>
                    <Text style={[styles.contactNumber, { color: theme.colors.primary }]}>{item.phoneNumber}</Text>
                    {item.role && (
                      <Text style={[styles.contactRole, { color: theme.colors.onSurfaceVariant }]}>
                        {item.role} {item.contactName ? `• ${item.contactName}` : ''}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="call" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            />
            <Button 
              title="Cancel" 
              variant="outline" 
              onPress={() => setContactsModalVisible(false)} 
              style={{ marginTop: 16 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  headerShareButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerImage: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  galleryIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  galleryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  contentContainer: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 24,
  },
  facilityName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metaItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metaSeparator: {
    marginHorizontal: 6,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginBottom: 24,
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
  },
  linkText: {
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verificationContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 12,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    maxHeight: '60%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
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

export default FacilityDetailsScreen;
