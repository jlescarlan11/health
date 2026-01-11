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
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing';

import { FacilitiesStackScreenProps } from '../types/navigation';
import { RootState } from '../store';
import { selectFacility } from '../store/facilitiesSlice';
import { Button } from '../components/common/Button';
import StandardHeader from '../components/common/StandardHeader';
import { calculateDistance, formatDistance } from '../utils/locationUtils';
import { getOpenStatus } from '../utils';
import { useTheme } from 'react-native-paper';

// Mock location hook - replace with actual implementation
const useUserLocation = () => ({
  latitude: 13.6226, // Naga City Hall latitude for example
  longitude: 123.186, // Naga City Hall longitude for example
  error: null,
});

type FacilityDetailsRouteProp = FacilitiesStackScreenProps<'FacilityDetails'>['route'];

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

  return <MaterialIcons name={getIconName(serviceName)} size={24} color={theme.colors.primary} style={styles.serviceIcon} />;
};

export const FacilityDetailsScreen = () => {
  const theme = useTheme();
  const route = useRoute<FacilityDetailsRouteProp>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { facilityId } = route.params || { facilityId: '' };

  const facility = useSelector((state: RootState) =>
    state.facilities.facilities.find((f) => f.id === facilityId)
  );

  const { latitude: userLat, longitude: userLon } = useUserLocation();

  const [isImageViewerVisible, setImageViewerVisible] = useState(false);

  const distance = useMemo(() => {
    if (!facility || !userLat || !userLon) return null;
    return calculateDistance(userLat, userLon, facility.latitude, facility.longitude);
  }, [facility, userLat, userLon]);

  if (!facility) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <StandardHeader title="Details" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>Facility not found.</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const images = facility.photoUrl ? [{ uri: facility.photoUrl }] : [];

  const handleCall = () => {
    if (facility.phone) {
      Linking.openURL(`tel:${facility.phone}`).catch(() => alert('Failed to open dialer.'));
    } else {
      alert('Phone number is not available.');
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

    if (url) Linking.openURL(url).catch(() => alert('Failed to open maps.'));
  };

  const openInAppMap = () => {
      dispatch(selectFacility(facility.id));
      // @ts-ignore - navigation types need update for this specific flow if strict
      navigation.navigate('FacilityDirectory', { initialViewMode: 'map' });
  };

  const handleDirections = () => {
    Alert.alert(
      'Get Directions',
      'Choose navigation method',
      [
        {
          text: 'In-App Map',
          onPress: openInAppMap
        },
        {
          text: 'External Maps',
          onPress: openExternalMaps
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${facility.name}\nAddress: ${facility.address}\nView on map: https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`,
        title: `Check out ${facility.name}`,
      });
    } catch (error) {
      alert('Failed to share.');
    }
  };

  const { isOpen, text: openStatusText, color: openStatusColor } = getOpenStatus(facility);
  
  // Use a static map image for preview. Replace YOUR_API_KEY with an actual key or use a placeholder if needed.
  // Note: For this demo, we'll assume a placeholder or valid URL construction.
  // Ideally, use a library like react-native-maps for interactive maps, but static image is requested for preview.
  const mapPreviewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${facility.latitude},${facility.longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${facility.latitude},${facility.longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <StandardHeader
        title={facility.name}
        showBackButton
        rightActions={
          <TouchableOpacity onPress={handleShare} style={styles.headerShareButton}>
            <Ionicons name="share-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <Text style={[styles.facilityName, { color: theme.colors.onSurface }]}>{facility.name}</Text>
              {facility.yakapAccredited && (
                <View style={[styles.yakapBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.yakapText}>YAKAP</Text>
                </View>
              )}
            </View>
            <Text style={[styles.facilityType, { color: theme.colors.onSurfaceVariant }]}>{facility.type}</Text>
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
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Address</Text>
              <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>{facility.address}</Text>
              {distance !== null && (
                <View style={[styles.distanceBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Ionicons name="navigate-circle-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.distanceText, { color: theme.colors.onSurfaceVariant }]}>{formatDistance(distance)} away</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Hours */}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Operating Hours</Text>
              <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>{facility.hours || 'Hours not available'}</Text>
              <View style={[styles.openStatus, { backgroundColor: openStatusColor === 'green' ? theme.colors.primaryContainer : theme.colors.errorContainer }]}>
                <Text style={[styles.openStatusText, { color: openStatusColor === 'green' ? theme.colors.primary : theme.colors.error }]}>
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
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Phone</Text>
              <Text style={[styles.infoText, styles.linkText, { color: theme.colors.primary }]}>{facility.phone || 'Not available'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {/* Services */}
          <View style={styles.servicesSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Services</Text>
            <View style={styles.servicesGrid}>
              {facility.services.map((service, index) => (
                <View key={index} style={[styles.serviceItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <ServiceIcon serviceName={service} />
                  <Text style={[styles.serviceText, { color: theme.colors.onSurface }]}>{service}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Map Preview */}
          <View style={styles.mapSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Location Preview</Text>
            <TouchableOpacity onPress={openInAppMap} style={[styles.mapContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Image source={{ uri: mapPreviewUrl }} style={styles.mapPreview} resizeMode="cover" />
               <View style={styles.mapOverlay}>
                <Ionicons name="map" size={32} color="white" />
                <Text style={styles.mapOverlayText}>Tap to view full map</Text>
              </View>
            </TouchableOpacity>
          </View>
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
  mapSection: {
    marginBottom: 20,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 180,
  },
  mapPreview: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mapOverlayText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 8,
  },
});

export default FacilityDetailsScreen;