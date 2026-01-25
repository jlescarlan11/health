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
} from 'react-native';
import { useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing';

import { RootStackScreenProps } from '../types/navigation';
import { RootState } from '../store';
import { Button } from '../components/common/Button';
import StandardHeader from '../components/common/StandardHeader';
import { calculateDistance, formatDistance } from '../utils/locationUtils';
import { getOpenStatus, formatOperatingHours, OPEN_COLOR, WARNING_COLOR } from '../utils/facilityUtils';
import { formatFacilityType } from '../utils';
import { useTheme } from 'react-native-paper';
import { useUserLocation } from '../hooks';
import { openExternalMaps } from '../utils/linkingUtils';

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

const ServiceIcon = ({ serviceName }: { serviceName: string }) => {
  const theme = useTheme();
  const getIconName = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes('consultation') || s.includes('medicine')) return 'healing';
    if (s.includes('laboratory') || s.includes('chemistry') || s.includes('microscopy')) return 'science';
    if (s.includes('family planning') || s.includes('maternal')) return 'family-restroom';
    if (s.includes('dental')) return 'medical-services';
    if (s.includes('emergency') || s.includes('trauma')) return 'notification-important';
    if (s.includes('pediatrics')) return 'child-care';
    if (s.includes('x-ray') || s.includes('radiology')) return 'settings-overscan';
    if (s.includes('blood') || s.includes('hematology')) return 'bloodtype';
    return 'local-hospital';
  };

  return (
    <MaterialIcons
      name={getIconName(serviceName) as keyof (typeof MaterialIcons)['glyphMap']}
      size={20}
      color={theme.colors.primary}
      style={styles.serviceIcon}
    />
  );
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

  const { location, errorMsg, permissionStatus, requestPermission } = useUserLocation();
  const reduxLocation = useSelector((state: RootState) => state.facilities.userLocation);

  const userLat = location?.coords.latitude || reduxLocation?.latitude;
  const userLon = location?.coords.longitude || reduxLocation?.longitude;

  const [isImageViewerVisible, setImageViewerVisible] = useState(false);

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
      facility.specialized_services.forEach(s => {
        if (!allServices.includes(s as any)) {
          allServices.push(s as any);
        }
      });
    }

    Object.entries(CATEGORIES).forEach(([category, services]) => {
      const found = allServices.filter(s => services.includes(s));
      if (found.length > 0) {
        grouped[category] = found;
      }
    });

    // Catch any remaining services
    const categorizedServices = Object.values(CATEGORIES).flat();
    const uncategorized = allServices.filter(s => !categorizedServices.includes(s));
    
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
    if (facility.phone) {
      Linking.openURL(`tel:${facility.phone}`).catch(() =>
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

  const { text: openStatusText, color: openStatusColor } = getOpenStatus(facility);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader
        title={facility.name}
        showBackButton
        rightActions={
          <TouchableOpacity onPress={handleShare} style={styles.headerShareButton}>
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
            <View style={styles.titleRow}>
              <Text style={[styles.facilityName, { color: theme.colors.onSurface }]}>
                {facility.name}
              </Text>
              {facility.yakapAccredited && (
                <Text style={[styles.yakapText, { color: theme.colors.onSurfaceVariant }]}>
                  • Yakap Accredited
                </Text>
              )}
            </View>
            <Text style={[styles.facilityType, { color: theme.colors.onSurfaceVariant }]}>
              {formatFacilityType(facility.type)}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionButtons}>
            <Button
              icon="phone"
              title="Call"
              onPress={handleCall}
              style={styles.actionButton}
              variant="primary"
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
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Address
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
                {facility.address}
              </Text>
              <View style={styles.locationActionsRow}>
                {typeof distance === 'number' && !isNaN(distance) ? (
                  <View style={styles.distanceContainer}>
                    <Ionicons
                      name="navigate-circle-outline"
                      size={14}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.distanceText, { color: theme.colors.onSurfaceVariant }]}>
                      {formatDistance(distance)} away
                    </Text>
                  </View>
                ) : (
                  permissionStatus === 'denied' || errorMsg ? (
                    <TouchableOpacity
                      onPress={requestPermission}
                      style={styles.distanceContainer}
                    >
                      <Ionicons name="location" size={14} color={theme.colors.error} />
                      <Text style={[styles.distanceText, { color: theme.colors.error }]}>
                        Enable location to see distance
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.distanceContainer}>
                      <Ionicons
                        name="navigate-circle-outline"
                        size={14}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text style={[styles.distanceText, { color: theme.colors.onSurfaceVariant }]}>
                        Distance unavailable
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </View>

          {/* Hours */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Operating Hours
              </Text>
              
              {formatOperatingHours(facility).map((line, idx) => (
                <Text key={idx} style={[styles.infoText, { color: theme.colors.onSurface }]}>
                  {line}
                </Text>
              ))}

              <Text
                style={[
                  styles.openStatusText,
                  {
                    color:
                      openStatusColor === WARNING_COLOR || openStatusColor === OPEN_COLOR
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant,
                    marginTop: 4,
                  },
                ]}
              >
                {openStatusText}
              </Text>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="call-outline" size={24} color={theme.colors.primary} />
            </View>
            <TouchableOpacity onPress={handleCall} style={styles.infoTextContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                Phone
              </Text>
              <Text style={[styles.infoText, styles.linkText, { color: theme.colors.primary }]}>
                {facility.phone || 'Not available'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {/* Grouped Services */}
          <View style={styles.servicesSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Services & Capabilities</Text>
            
            {Object.entries(groupedServices).map(([category, services]) => (
              <View key={category} style={styles.categoryContainer}>
                <Text style={[styles.categoryTitle, { color: theme.colors.primary }]}>{category}</Text>
                <View style={styles.servicesGrid}>
                  {services.map((service, index) => (
                    <View
                      key={index}
                      style={[styles.serviceItem, { backgroundColor: theme.colors.surfaceVariant }]}
                    >
                      <ServiceIcon serviceName={service} />
                      <Text style={[styles.serviceText, { color: theme.colors.onSurface }]}>
                        {service}
                      </Text>
                    </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  facilityName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
    flexShrink: 1,
  },
  yakapText: {
    fontSize: 14,
    fontWeight: '600',
  },
  facilityType: {
    fontSize: 16,
    fontWeight: '500',
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
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  locationActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  openStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  servicesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  serviceIcon: {
    marginRight: 8,
  },
  serviceText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
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
});

export default FacilityDetailsScreen;
