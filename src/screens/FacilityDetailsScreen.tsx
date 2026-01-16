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
  Platform,
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
import { getOpenStatus } from '../utils';
import { useTheme } from 'react-native-paper';
import { useUserLocation } from '../hooks';

type FacilityDetailsRouteProp = RootStackScreenProps<'FacilityDetails'>['route'];

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 250;

const ServiceIcon = ({ serviceName }: { serviceName: string }) => {
  const theme = useTheme();
  const getIconName = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes('consultation')) return 'healing';
    if (s.includes('laboratory')) return 'science';
    if (s.includes('family planning')) return 'family-restroom';
    if (s.includes('maternal')) return 'pregnant-woman';
    if (s.includes('dental')) return 'medical-services';
    return 'local-hospital';
  };

  return (
    <MaterialIcons
      name={getIconName(serviceName) as keyof (typeof MaterialIcons)['glyphMap']}
      size={24}
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
      Linking.openURL(`tel:${facility.phone}`).catch(() => Alert.alert('Error', 'Failed to open dialer.'));
    } else {
      Alert.alert('Not Available', 'Phone number is not available.');
    }
  };

  const openExternalMaps = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${facility.latitude},${facility.longitude}`;
    const label = facility.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) Linking.openURL(url).catch(() => Alert.alert('Error', 'Failed to open maps.'));
  };

  const handleDirections = () => {
    openExternalMaps();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${facility.name}\nAddress: ${facility.address}\nView on map: https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`,
        title: `Check out ${facility.name}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to share.');
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
                <View style={[styles.yakapBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.yakapText}>YAKAP</Text>
                </View>
              )}
            </View>
            <Text style={[styles.facilityType, { color: theme.colors.onSurfaceVariant }]}>
              {facility.type}
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
              variant="outline"
            />
            <Button
              icon="share"
              title="Share"
              onPress={handleShare}
              style={styles.actionButton}
              variant="outline"
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
              {distance !== null ? (
                <View
                  style={[styles.distanceBadge, { backgroundColor: theme.colors.surfaceVariant }]}
                >
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
                (permissionStatus === 'denied' || errorMsg) && (
                  <TouchableOpacity
                    onPress={requestPermission}
                    style={[styles.distanceBadge, { backgroundColor: theme.colors.errorContainer }]}
                  >
                    <Ionicons name="location" size={14} color={theme.colors.error} />
                    <Text style={[styles.distanceText, { color: theme.colors.error }]}>
                      Enable location to see distance
                    </Text>
                  </TouchableOpacity>
                )
              )}
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
              <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
                {facility.is_24_7
                  ? 'Open 24 Hours, 7 Days a Week'
                  : facility.hours || 'Hours not available'}
              </Text>
              <View
                style={[
                  styles.openStatus,
                  {
                    backgroundColor:
                      openStatusColor === 'green'
                        ? theme.colors.primaryContainer
                        : theme.colors.errorContainer,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.openStatusText,
                    {
                      color:
                        openStatusColor === 'green' ? theme.colors.primary : theme.colors.error,
                    },
                  ]}
                >
                  {openStatusText}
                </Text>
              </View>
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

          {/* Services */}
          <View style={styles.servicesSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Services</Text>
            <View style={styles.servicesGrid}>
              {facility.services.map((service, index) => (
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

          {facility.specialized_services && facility.specialized_services.length > 0 && (
            <View style={styles.servicesSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Specialized Capabilities
              </Text>
              <View style={styles.servicesGrid}>
                {facility.specialized_services.map((service, index) => (
                  <View
                    key={index}
                    style={[
                      styles.serviceItem,
                      { backgroundColor: theme.colors.primaryContainer + '30' },
                    ]}
                  >
                    <MaterialIcons
                      name="stars"
                      size={24}
                      color={theme.colors.primary}
                      style={styles.serviceIcon}
                    />
                    <Text style={[styles.serviceText, { color: theme.colors.onSurface }]}>
                      {service}
                    </Text>
                  </View>
                ))}
              </View>
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
  yakapBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  yakapText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
    textTransform: 'uppercase',
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
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 13,
    marginLeft: 4,
  },
  openStatus: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  openStatusText: {
    fontSize: 13,
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
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  serviceIcon: {
    marginRight: 10,
  },
  serviceText: {
    fontSize: 14,
    flex: 1,
  },
});

export default FacilityDetailsScreen;
