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
                    <Surface style={[styles.emergencyBanner, { backgroundColor: theme.colors.error }]} elevation={4}>
                        <View style={styles.emergencyHeader}>
                            <MaterialCommunityIcons name="alert-octagon" size={48} color="white" />
                            <View style={styles.emergencyTextContainer}>
                                <Text style={styles.emergencyTitle}>EMERGENCY DETECTED</Text>
                                <Text style={styles.emergencySubtitle}>Seek care immediately</Text>
                            </View>
                        </View>
                        <Text style={styles.emergencyText}>
                            Your symptoms indicate a potential medical emergency. Go to the nearest hospital or call 911 right now.
                        </Text>
                        <EmergencyButton 
                            onPress={() => handleCall('911')} 
                            style={styles.emergencyButton}
                            buttonColor="white"
                            textColor={theme.colors.error}
                        />
                    </Surface>
                )}

                {/* Mental Health Support */}
                {isMentalHealth && (
                    <Surface style={[styles.mhBanner, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={1}>
                        <View style={styles.mhHeader}>
                            <MaterialCommunityIcons name="heart-pulse" size={32} color={theme.colors.onTertiaryContainer} />
                            <Text variant="titleLarge" style={[styles.mhTitle, { color: theme.colors.onTertiaryContainer }]}>
                                You're not alone
                            </Text>
                        </View>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onTertiaryContainer, marginBottom: 16, lineHeight: 22 }}>
                            {recommendation.reasoning}
                        </Text>
                        <Divider style={{ backgroundColor: theme.colors.tertiary, opacity: 0.2, marginBottom: 16 }} />
                        <View style={styles.mhActionRow}>
                            <View style={{ flex: 1 }}>
                                <Text variant="labelLarge" style={{ color: theme.colors.onTertiaryContainer, fontWeight: 'bold' }}>
                                    24/7 Crisis Hotline
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer }}>
                                    Confidential support is available
                                </Text>
                            </View>
                            <Button 
                                icon="phone" 
                                mode="contained" 
                                buttonColor={theme.colors.tertiary}
                                textColor={theme.colors.onTertiary}
                                onPress={() => handleCall('09175584673')}
                                style={styles.mhButton}
                            >
                                Call Now
                            </Button>
                        </View>
                    </Surface>
                )}

                {/* Recommendation Card */}
                {!isMentalHealth && (
                    <Card mode="outlined" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content style={styles.cardHeader}>
                            <Avatar.Icon 
                                size={56} 
                                icon={isEmergency ? "ambulance" : "hospital-building"} 
                                style={{ backgroundColor: isEmergency ? theme.colors.errorContainer : theme.colors.primaryContainer }}
                                color={isEmergency ? theme.colors.error : theme.colors.primary}
                            />
                            <View style={styles.recTextContainer}>
                                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 1 }}>CARE LEVEL</Text>
                                <Text variant="headlineSmall" style={{ 
                                    color: isEmergency ? theme.colors.error : theme.colors.primary, 
                                    fontWeight: 'bold',
                                }}>
                                    {recommendation.recommended_level}
                                </Text>
                            </View>
                        </Card.Content>
                        <Divider style={styles.divider} />
                        <Card.Content>
                            <Text variant="bodyLarge" style={[styles.reasoning, { color: theme.colors.onSurface }]}>
                                {recommendation.reasoning}
                            </Text>
                            {recommendation.red_flags && recommendation.red_flags.length > 0 && (
                                <View style={[styles.redFlags, { backgroundColor: theme.colors.errorContainer }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <MaterialCommunityIcons name="alert-circle" size={20} color={theme.colors.error} />
                                        <Text variant="labelLarge" style={{ color: theme.colors.error, fontWeight: 'bold', marginLeft: 8 }}>
                                            IMPORTANT ALERTS
                                        </Text>
                                    </View>
                                    {recommendation.red_flags.map((flag: string, idx: number) => (
                                        <Text key={idx} variant="bodyMedium" style={{ color: theme.colors.onErrorContainer, marginLeft: 28, marginBottom: 4 }}>
                                            • {flag}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </Card.Content>
                    </Card>
                )}

                {/* Nearest Facilities */}
                <View style={styles.facilitiesSection}>
                    <Text variant="titleLarge" style={styles.sectionTitle}>
                        {isEmergency ? "Nearest Emergency Care" : "Recommended Facilities"}
                    </Text>
                    <Text variant="bodySmall" style={styles.sectionSubtitle}>
                        Based on your current location and symptoms
                    </Text>
                    
                    {recommendedFacilities.map(facility => (
                        <Card key={facility.id} mode="elevated" style={styles.facilityCard}>
                            <FacilityCard 
                                facility={facility} 
                                showDistance={true}
                                distance={facility.distance}
                                onPress={() => handleViewDetails(facility.id)}
                            />
                            <View style={[styles.actionRow, { borderTopColor: theme.colors.outlineVariant }]}>
                                <Button 
                                    icon="phone" 
                                    mode="text" 
                                    onPress={() => handleCall(facility.phone)}
                                    disabled={!facility.phone}
                                    style={styles.actionButton}
                                >
                                    Call
                                </Button>
                                <Divider style={{ width: 1, height: '60%' }} />
                                <Button 
                                    icon="directions" 
                                    mode="text" 
                                    onPress={() => handleDirections(facility)}
                                    style={styles.actionButton}
                                >
                                    Directions
                                </Button>
                            </View>
                        </Card>
                    ))}

                    {recommendedFacilities.length === 0 && (
                         <Surface style={styles.emptyState} elevation={0}>
                            <MaterialCommunityIcons name="map-marker-off" size={48} color={theme.colors.outline} />
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                                No matching facilities found nearby.
                            </Text>
                         </Surface>
                    )}
                </View>

                {/* Disclaimer */}
                <View style={styles.footer}>
                     <DisclaimerBanner onAccept={() => {}} visible={true} />
                     <Button 
                        mode="outlined" 
                        onPress={() => navigation.popToTop()} 
                        style={styles.doneButton}
                        icon="home"
                     >
                        Back to Home
                     </Button>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontWeight: '500' },
    content: { padding: 16, paddingVertical: 24, paddingBottom: 60 },
    
    emergencyBanner: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 32,
    },
    emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    emergencyTextContainer: { flex: 1, marginLeft: 16 },
    emergencyTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
    emergencySubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold' },
    emergencyText: { color: 'white', fontSize: 16, marginBottom: 20, lineHeight: 22 },
    emergencyButton: { borderRadius: 12 },
    
    mhBanner: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 32,
    },
    mhHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    mhTitle: { marginLeft: 12, fontWeight: 'bold' },
    mhActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    mhButton: { borderRadius: 12 },

    card: { marginBottom: 32, borderRadius: 16, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    recTextContainer: { marginLeft: 16, flex: 1 },
    reasoning: { lineHeight: 24, marginBottom: 8 },
    divider: { marginHorizontal: 16 },
    redFlags: { marginTop: 16, padding: 16, borderRadius: 12 },
    
    facilitiesSection: { marginBottom: 32 },
    sectionTitle: { fontWeight: 'bold', marginBottom: 4 },
    sectionSubtitle: { color: '#666', marginBottom: 16 },
    
    facilityCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
    actionRow: { 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-around', 
        paddingVertical: 4,
        borderTopWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.02)'
    },
    actionButton: { flex: 1 },
    
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
    
    footer: { marginTop: 8 },
    doneButton: { marginTop: 16, borderRadius: 12 }
});

export default RecommendationScreen;