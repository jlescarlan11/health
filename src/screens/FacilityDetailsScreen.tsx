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
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ImageViewing from 'react-native-image-viewing';

import { RootStackParamList } from '../types/navigation';
import { RootState } from '../store';
import { Button } from '../components/common/Button';
import { calculateDistance, formatDistance } from '../utils/locationUtils';
import { Facility } from '../types';

// Mock location hook - replace with actual implementation
const useUserLocation = () => ({
  latitude: 13.6226, // Naga City Hall latitude for example
  longitude: 123.186, // Naga City Hall longitude for example
  error: null,
});

type FacilityDetailsRouteProp = RouteProp<RootStackParamList, 'FacilityDetails'>;

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 250;

const ServiceIcon = ({ serviceName }: { serviceName: string }) => {
  const getIconName = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes('consultation')) return 'healing';
    if (s.includes('laboratory')) return 'science';
    if (s.includes('family planning')) return 'family-restroom';
    if (s.includes('maternal')) return 'pregnant-woman';
    if (s.includes('dental')) return 'medical-services';
    return 'local-hospital';
  };

  return <MaterialIcons name={getIconName(serviceName)} size={24} color="#4A90E2" style={styles.serviceIcon} />;
};


export const FacilityDetailsScreen = () => {
  const route = useRoute<FacilityDetailsRouteProp>();
  const { facilityId } = route.params;

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
      <SafeAreaView style={styles.centered}>
        <Text>Facility not found.</Text>
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

  const handleDirections = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${facility.latitude},${facility.longitude}`;
    const label = facility.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) Linking.openURL(url).catch(() => alert('Failed to open maps.'));
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

  const isCurrentlyOpen = () => {
    // This is a placeholder. A robust implementation would parse `facility.hours`
    // and compare it with the current time and day.
    return true; // Assume open for now
  };
  
  const mapPreviewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${facility.latitude},${facility.longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${facility.latitude},${facility.longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView>
        <TouchableOpacity onPress={() => images.length > 0 && setImageViewerVisible(true)}>
          <Image
            source={images.length > 0 ? { uri: images[0].uri } : require('../../assets/icon.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
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
          <View style={styles.headerSection}>
            <Text style={styles.facilityName}>{facility.name}</Text>
            {facility.yakapAccredited && (
              <View style={styles.yakapBadge}>
                <Text style={styles.yakapText}>YAKAP</Text>
              </View>
            )}
          </View>
          <Text style={styles.facilityType}>{facility.type}</Text>

          <View style={styles.actionButtons}>
            <Button icon="phone" title="Call" onPress={handleCall} style={styles.actionButton} variant="outline" />
            <Button icon="directions" title="Directions" onPress={handleDirections} style={styles.actionButton} variant="outline" />
            <Button icon="share" title="Share" onPress={handleShare} style={styles.actionButton} variant="outline" />
          </View>

          <View style={styles.infoSection}>
            <MaterialIcons name="location-on" size={24} color="#4A90E2" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>{facility.address}</Text>
              {distance !== null && <Text style={styles.distanceText}>About {formatDistance(distance)} away</Text>}
            </View>
          </View>
          
          <View style={styles.infoSection}>
            <MaterialIcons name="access-time" size={24} color="#4A90E2" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>{facility.hours || 'Hours not available'}</Text>
              <View style={[styles.openStatus, isCurrentlyOpen() ? styles.open : styles.closed]}>
                <Text style={styles.openStatusText}>{isCurrentlyOpen() ? 'Open Now' : 'Closed'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <MaterialIcons name="phone" size={24} color="#4A90E2" />
            <TouchableOpacity onPress={handleCall} style={styles.infoTextContainer}>
              <Text style={[styles.infoText, styles.linkText]}>{facility.phone || 'Not available'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.servicesGrid}>
              {facility.services.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <ServiceIcon serviceName={service} />
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity onPress={handleDirections}>
              <Image source={{ uri: mapPreviewUrl }} style={styles.mapPreview} resizeMode="cover" />
               <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayText}>Tap to view in map</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerImage: {
    width: width,
    height: IMAGE_HEIGHT,
    backgroundColor: '#E0E0E0',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  facilityName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  yakapBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  yakapText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  facilityType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  linkText: {
    color: '#1A0DAB',
    textDecorationLine: 'underline',
  },
  distanceText: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  openStatus: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  open: {
    backgroundColor: '#D4EDDA',
  },
  closed: {
    backgroundColor: '#F8D7DA',
  },
  openStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  servicesSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    marginRight: 10,
  },
  serviceText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
  },
  mapSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  mapPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  mapOverlayText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default FacilityDetailsScreen;