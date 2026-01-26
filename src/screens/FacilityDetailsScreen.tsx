import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing';
import { useTheme } from 'react-native-paper';

import { Text } from '../components/common/Text';
import { Button } from '../components/common/Button';
import { FacilityActionButtons } from '../components/common/FacilityActionButtons';
import StandardHeader from '../components/common/StandardHeader';
import { FacilityStatusIndicator } from '../components/common/FacilityStatusIndicator';
import { useUserLocation } from '../hooks';
import { useAdaptiveUI } from '../hooks/useAdaptiveUI';
import { openExternalMaps } from '../utils/linkingUtils';
import { ServiceChip } from '../components/common/ServiceChip';
import { sharingUtils } from '../utils/sharingUtils';
import { calculateDistance, formatDistance } from '../utils/locationUtils';
import { formatOperatingHours } from '../utils/facilityUtils';
import { formatFacilityType } from '../utils/stringUtils';
import { RootState } from '../store';
import { RootStackScreenProps } from '../types/navigation';
import { theme as appTheme } from '../theme';

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
  const { scaleFactor } = useAdaptiveUI();
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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const distance = useMemo(() => {
    if (!facility || !userLat || !userLon) return null;
    return calculateDistance(userLat, userLon, facility.latitude, facility.longitude);
  }, [facility, userLat, userLon]);

  const groupedServices = useMemo(() => {
    if (!facility) return {};

    const grouped: Record<string, string[]> = {};
    const allServices = [...(facility.services || [])];

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

  const hasServiceGroups = Object.keys(groupedServices).length > 0;

  const infoLabelStyle = [
    styles.sectionLabel,
    {
      color: theme.colors.onSurface,
      fontSize: 12 * scaleFactor,
      fontWeight: '700',
    },
  ];

  const infoValueTypography = {
    fontSize: 16 * scaleFactor,
    lineHeight: 24 * scaleFactor,
  };

  const infoValueTextStyle = [
    styles.infoText,
    infoValueTypography,
    { color: theme.colors.onSurfaceVariant },
  ];

  const contactPhoneTextStyle = [
    styles.infoText,
    styles.linkText,
    infoValueTypography,
    { color: theme.colors.primary },
  ];

  const contactPhoneDisabledTextStyle = [
    styles.infoText,
    styles.linkText,
    infoValueTypography,
    { color: theme.colors.onSurfaceVariant },
  ];

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

  const handleShare = async () => {
    if (facility) {
      await sharingUtils.shareFacilityInfo(facility);
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

  const themeSpacing = (theme as typeof appTheme).spacing ?? appTheme.spacing;
  const minBottomSpacing = themeSpacing.md ?? 12;
  const baseBottomPadding = themeSpacing.lg ?? 16;
  const scrollBottomPadding = Math.max(insets.bottom, minBottomSpacing) + baseBottomPadding;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
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
              <Ionicons name="images-outline" size={16 * scaleFactor} color="#fff" />
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
            <Text
              style={[
                styles.facilityName,
                { color: theme.colors.onSurface, fontSize: 24 * scaleFactor },
              ]}
            >
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

            <FacilityStatusIndicator facility={facility} />
          </View>

          {/* Quick Actions */}
          <FacilityActionButtons
            contacts={facility.contacts}
            primaryPhone={facility.phone}
            onDirectionsPress={handleDirections}
            containerStyle={styles.actionButtons}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {/* Location */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="location-outline"
                size={24 * scaleFactor}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={infoLabelStyle}>Address</Text>
              <Text style={infoValueTextStyle}>
                {facility.address}
              </Text>
            </View>
          </View>

          {/* Hours */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={24 * scaleFactor} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={infoLabelStyle}>Operating Hours</Text>

              {formatOperatingHours(facility).map((line, idx) => (
                <Text key={idx} style={infoValueTextStyle}>
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
                size={24 * scaleFactor}
                color={
                  facility.contacts?.length || facility.phone
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant
                }
              />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={infoLabelStyle}>Phone</Text>

              {facility.contacts &&
              facility.contacts.filter((c) => c.platform === 'phone').length > 0 ? (
                facility.contacts
                  .filter((c) => c.platform === 'phone')
                  .map((contact, index) => (
                    <TouchableOpacity
                      key={contact.id || index}
                      onPress={() => Linking.openURL(`tel:${contact.phoneNumber}`)}
                      style={styles.contactItem}
                    >
                      <View style={styles.contactInfo}>
                        <Text style={contactPhoneTextStyle}>{contact.phoneNumber}</Text>
                        {contact.role && (
                          <Text style={[styles.metaItem, { fontSize: 14 * scaleFactor }]}>
                            {contact.role} {contact.contactName ? `• ${contact.contactName}` : ''}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
              ) : (
                <TouchableOpacity
                  onPress={() => facility.phone && Linking.openURL(`tel:${facility.phone}`)}
                  disabled={!facility.phone}
                >
                  <Text
                    style={
                      facility.phone
                        ? contactPhoneTextStyle
                        : contactPhoneDisabledTextStyle
                    }
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
            <View style={styles.servicesHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Services</Text>
            </View>

            {hasServiceGroups ? (
              Object.entries(groupedServices).map(([category, services]) => {
                const isExpanded = expandedCategories[category];
                const visibleServices = isExpanded ? services : services.slice(0, 6);
                const hasMore = services.length > 6;

                return (
                  <View key={category} style={styles.categoryContainer}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={styles.servicesGrid}>
                      {visibleServices.map((service, index) => (
                        <ServiceChip key={index} service={service} />
                      ))}
                    </View>
                    {hasMore && (
                      <TouchableOpacity
                        onPress={() =>
                          setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
                        }
                        style={styles.seeAllButton}
                      >
                        <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                          {isExpanded ? 'Show Less' : `See All (${services.length})`}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16 * scaleFactor}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <Text
                style={[
                  styles.servicesHint,
                  { color: theme.colors.onSurfaceVariant, fontWeight: '500' },
                ]}
              >
                Services information is not available.
              </Text>
            )}
          </View>

          {facility.lastUpdated && (
            <View style={styles.verificationContainer}>
              <Text
                style={[
                  styles.verificationText,
                  { color: theme.colors.outline },
                ]}
              >
                Data verified as of {new Date(facility.lastUpdated).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 0,
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
    marginBottom: 24,
  },
  divider: {
    height: 1,
    marginBottom: 24,
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 32, // Increased spacing
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
    fontWeight: '700',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400', // Body copy weight
  },
  linkText: {
    fontWeight: '500',
  },
  servicesSection: {
    marginBottom: 24,
  },
  servicesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  servicesToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesToggleText: {
    fontWeight: '600',
    marginRight: 4,
  },
  servicesHint: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#164032',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12, // Increased gap for better vertical separation
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  contactInfo: {
    flex: 1,
    marginRight: 16,
  },
});

export default FacilityDetailsScreen;
