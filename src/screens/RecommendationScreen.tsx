import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Avatar, IconButton, useTheme, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { CheckStackParamList, CheckStackScreenProps } from '../types/navigation';
import { geminiClient } from '../api/geminiClient';
import { EmergencyButton } from '../components/common/EmergencyButton';
import { FacilityCard } from '../components/common/FacilityCard';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility } from '../types';
import { useUserLocation } from '../hooks';

type ScreenProps = CheckStackScreenProps<'Recommendation'>;

const RecommendationScreen = () => {
    const route = useRoute<RouteProp<CheckStackParamList, 'Recommendation'>>();
    const navigation = useNavigation<ScreenProps['navigation']>();
    const theme = useTheme();
    
    // Try to get location to improve sorting
    useUserLocation({ watch: false });

    const { assessmentData } = route.params;
    const { facilities } = useSelector((state: RootState) => state.facilities);
    
    const [loading, setLoading] = useState(true);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [recommendedFacilities, setRecommendedFacilities] = useState<Facility[]>([]);

    useEffect(() => {
        analyzeSymptoms();
    }, []);

    useEffect(() => {
        if (recommendation && facilities.length > 0) {
            filterFacilities();
        }
    }, [recommendation, facilities]);

    const analyzeSymptoms = async () => {
        try {
            setLoading(true);
            
            const context = `Initial Symptom: ${assessmentData.symptoms}. Answers: ${JSON.stringify(assessmentData.answers)}`;
            const response = await geminiClient.assessSymptoms(context);

            // Map new API response to screen state
            setRecommendation({
                ...response,
                reasoning: response.assessment_summary,
                isMentalHealth: response.red_flags.some(f => 
                    ['suicide', 'self-harm', 'kill myself', 'hopelessness'].some(k => f.toLowerCase().includes(k))
                ) || response.assessment_summary.toLowerCase().includes('mental health'),
                // Infer nearest facility type for filtering
                nearest_facility_type: response.recommended_level === 'health_center' ? 'Health Center' : 'Hospital'
            });

        } catch (error) {
            console.error("Analysis Error:", error);
            // Fallback
            setRecommendation({
                recommended_level: "health_center",
                reasoning: "Based on your symptoms, a visit to the local health center is recommended for a check-up.",
                red_flags: [],
                nearest_facility_type: "Health Center"
            });
        } finally {
            setLoading(false);
        }
    };

    const filterFacilities = () => {
        if (!recommendation) return;

        const targetLevel = recommendation.recommended_level || "";
        
        // Normalize types for matching
        const isEmergency = targetLevel === 'emergency' || targetLevel === 'hospital';
        const isHealthCenter = targetLevel === 'health_center';

        let filtered = facilities.filter(f => {
            if (isEmergency) return f.type === 'Hospital' || f.type === 'Infirmary/Hospital';
            if (isHealthCenter) return f.type.includes('Health') || f.type.includes('Unit') || f.type.includes('Center');
            return true; // Default to all if unsure
        });

        // If no matches found with strict filtering, fallback to all sorted by distance
        if (filtered.length === 0) filtered = [...facilities];

        // Sort by distance (assuming distance is populated in store)
        filtered.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));

        setRecommendedFacilities(filtered.slice(0, 3));
    };

    const handleCall = (phoneNumber?: string) => {
        if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
    };

    const handleDirections = (facility: Facility) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${facility.latitude},${facility.longitude}`;
        const label = facility.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        if (url) Linking.openURL(url);
    };

    const handleViewDetails = (facilityId: string) => {
        // Navigate to details screen instead of map
        // Since we are in CheckNavigator, we might need to go to Find navigator or just push details if it's available
        // Usually FacilitiesNavigator handles details.
        navigation.navigate('Find', {
            screen: 'FacilityDetails',
            params: { facilityId } 
        });
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Analyzing symptoms...</Text>
            </View>
        );
    }

    if (!recommendation) return null;

    const isEmergency = recommendation.recommended_level === 'Emergency' || recommendation.recommended_level?.toLowerCase().includes('emergency');
    const isMentalHealth = recommendation.isMentalHealth;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
            <ScrollView contentContainerStyle={styles.content}>
                
                {/* Emergency Alert */}
                {isEmergency && (
                    <View style={[styles.emergencyBanner, { backgroundColor: theme.colors.error }]}>
                        <View style={styles.emergencyHeader}>
                            <MaterialCommunityIcons name="alert-octagon" size={48} color="white" />
                            <View style={styles.emergencyTextContainer}>
                                <Text style={styles.emergencyTitle}>SEEK EMERGENCY CARE IMMEDIATELY</Text>
                            </View>
                        </View>
                        <Text style={styles.emergencyText}>
                            Your symptoms indicate a potential medical emergency. Go to the nearest hospital immediately.
                        </Text>
                        <EmergencyButton 
                            onPress={() => handleCall('911')} 
                            style={styles.emergencyButton}
                            buttonColor="white"
                            textColor={theme.colors.error}
                        />
                    </View>
                )}

                {/* Mental Health Support */}
                {isMentalHealth && (
                    <Surface style={[styles.mhBanner, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={2}>
                        <View style={styles.mhHeader}>
                            <MaterialCommunityIcons name="heart-pulse" size={40} color={theme.colors.onTertiaryContainer} />
                            <Text variant="headlineSmall" style={[styles.mhTitle, { color: theme.colors.onTertiaryContainer }]}>
                                We are here to help
                            </Text>
                        </View>
                        <Text style={{ color: theme.colors.onTertiaryContainer, marginBottom: 16 }}>
                            {recommendation.reasoning}
                        </Text>
                        <Text style={{ fontWeight: 'bold', color: theme.colors.onTertiaryContainer }}>
                            24/7 Crisis Hotline:
                        </Text>
                        <Button 
                            icon="phone" 
                            mode="contained" 
                            buttonColor={theme.colors.tertiary}
                            textColor={theme.colors.onTertiary}
                            onPress={() => handleCall('09175584673')} // Example Hopeline PH
                            style={styles.mhButton}
                        >
                            Call Hopeline: 0917-558-4673
                        </Button>
                    </Surface>
                )}

                {/* Recommendation Card */}
                {!isMentalHealth && (
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content style={styles.cardHeader}>
                            <Avatar.Icon 
                                size={64} 
                                icon={isEmergency ? "ambulance" : "hospital-building"} 
                                style={{ backgroundColor: isEmergency ? theme.colors.error : theme.colors.primary }}
                            />
                            <View style={styles.recTextContainer}>
                                <Text variant="titleMedium">Recommended Care</Text>
                                <Text variant="headlineSmall" style={{ 
                                    color: isEmergency ? theme.colors.error : theme.colors.primary, 
                                    fontWeight: 'bold',
                                    flexWrap: 'wrap'
                                }}>
                                    {recommendation.recommended_level}
                                </Text>
                            </View>
                        </Card.Content>
                        <Divider style={styles.divider} />
                        <Card.Content>
                            <Text variant="bodyMedium" style={[styles.reasoning, { color: theme.colors.onSurface }]}>{recommendation.reasoning}</Text>
                            {recommendation.red_flags && recommendation.red_flags.length > 0 && (
                                <View style={[styles.redFlags, { backgroundColor: theme.colors.errorContainer }]}>
                                    <Text style={{ color: theme.colors.error, fontWeight: 'bold', marginBottom: 4 }}>
                                        <MaterialCommunityIcons name="alert" size={16} /> Important Alerts:
                                    </Text>
                                    {recommendation.red_flags.map((flag: string, idx: number) => (
                                        <Text key={idx} style={{ color: theme.colors.error, marginLeft: 8 }}>• {flag}</Text>
                                    ))}
                                </View>
                            )}
                        </Card.Content>
                    </Card>
                )}

                {/* Nearest Facilities */}
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    {isEmergency ? "Nearest Hospitals" : "Recommended Facilities"}
                </Text>
                
                {recommendedFacilities.map(facility => (
                    <View key={facility.id} style={styles.facilityWrapper}>
                        <FacilityCard 
                            facility={facility} 
                            showDistance={true}
                            distance={facility.distance}
                            onPress={() => handleViewDetails(facility.id)}
                        />
                        <View style={[styles.actionRow, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
                            <Button 
                                icon="phone" 
                                mode="text" 
                                compact 
                                disabled={!facility.phone}
                                onPress={() => handleCall(facility.phone)}
                            >
                                Call
                            </Button>
                            <Button 
                                icon="directions" 
                                mode="text" 
                                compact 
                                onPress={() => handleDirections(facility)}
                            >
                                Directions
                            </Button>
                        </View>
                    </View>
                ))}

                {recommendedFacilities.length === 0 && (
                     <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
                        No matching facilities found nearby.
                     </Text>
                )}

                {/* Disclaimer */}
                <View style={styles.footer}>
                     <DisclaimerBanner onAccept={() => {}} visible={true} />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16 },
    content: { padding: 16, paddingBottom: 40 },
    
    emergencyBanner: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        elevation: 4
    },
    emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    emergencyTextContainer: { flex: 1, marginLeft: 12 },
    emergencyTitle: { color: 'white', fontWeight: 'bold', fontSize: 20, flexWrap: 'wrap' },
    emergencyText: { color: 'white', fontSize: 16, marginBottom: 16 },
    emergencyButton: { marginVertical: 8 },
    
    mhBanner: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    mhHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    mhTitle: { marginLeft: 12, fontWeight: 'bold' },
    mhButton: { marginTop: 8 },

    card: { marginBottom: 24, borderRadius: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    recTextContainer: { marginLeft: 16, flex: 1 },
    reasoning: { lineHeight: 22 },
    divider: { marginVertical: 8 },
    redFlags: { marginTop: 16, padding: 12, borderRadius: 8 },
    
    sectionTitle: { marginBottom: 12, fontWeight: 'bold', marginTop: 8 },
    
    facilityWrapper: { marginBottom: 16 },
    actionRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        borderBottomLeftRadius: 12, 
        borderBottomRightRadius: 12,
        marginTop: -8, // tuck under the card
        paddingTop: 8,
        paddingBottom: 4,
        elevation: 1,
        borderTopWidth: 1,
    },
    
    mapPreview: { height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
    mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    footer: { marginTop: 16 }
});

export default RecommendationScreen;