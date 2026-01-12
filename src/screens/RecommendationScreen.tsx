import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Avatar, IconButton, useTheme, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { CheckStackParamList, CheckStackScreenProps } from '../types/navigation';
import { geminiClient, AssessmentResponse } from '../api/geminiClient';
import { EmergencyButton } from '../components/common/EmergencyButton';
import { FacilityCard } from '../components/common/FacilityCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility } from '../types';
import { useUserLocation } from '../hooks';
import { fetchFacilities } from '../store/facilitiesSlice';
import StandardHeader from '../components/common/StandardHeader';

type ScreenProps = CheckStackScreenProps<'Recommendation'>;

const RecommendationScreen = () => {
    const route = useRoute<RouteProp<CheckStackParamList, 'Recommendation'>>();
    const navigation = useNavigation<ScreenProps['navigation']>();
    const theme = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    
    // Try to get location to improve sorting
    useUserLocation({ watch: false });

    const { assessmentData } = route.params;
    const { facilities, isLoading: isFacilitiesLoading } = useSelector((state: RootState) => state.facilities);
    
    const [loading, setLoading] = useState(true);
    const [recommendation, setRecommendation] = useState<AssessmentResponse | null>(null);
    const [recommendedFacilities, setRecommendedFacilities] = useState<Facility[]>([]);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            header: () => (
                <StandardHeader 
                    title="Recommendation" 
                    showBackButton 
                    onBackPress={() => navigation.popToTop()} 
                />
            ),
        });
    }, [navigation]);

    useEffect(() => {
        analyzeSymptoms();
        // Load facilities if they aren't in the store
        if (facilities.length === 0) {
            dispatch(fetchFacilities({ page: 1, refresh: true }));
        }
    }, []);

    useEffect(() => {
        if (recommendation && (facilities.length > 0 || !isFacilitiesLoading)) {
            filterFacilities();
        }
    }, [recommendation, facilities, isFacilitiesLoading]);

    const analyzeSymptoms = async () => {
        try {
            setLoading(true);
            const context = `Initial Symptom: ${assessmentData.symptoms}. Answers: ${JSON.stringify(assessmentData.answers)}`;
            const response = await geminiClient.assessSymptoms(context);
            setRecommendation(response);
        } catch (error) {
            console.error("Analysis Error:", error);
            // Fallback
            setRecommendation({
                recommended_level: "health_center",
                condition_summary: "Based on your symptoms, we recommend a professional medical check-up.",
                recommended_action: "Visit your local health center for an initial assessment.",
                key_concerns: ["Persistent symptoms", "Need for professional evaluation"],
                critical_warnings: [],
                relevant_services: ["Consultation"],
                red_flags: [],
                confidence_score: 0.5,
            });
        } finally {
            setLoading(false);
        }
    };

    const filterFacilities = () => {
        if (!recommendation) return;

        const targetLevel = recommendation.recommended_level;
        
        // Normalize types for matching
        const isEmergency = targetLevel === 'emergency' || targetLevel === 'hospital';
        const isHealthCenter = targetLevel === 'health_center';

        let filtered = facilities.filter(f => {
            const type = f.type?.toLowerCase() || '';
            if (isEmergency) return type.includes('hospital') || type.includes('infirmary') || type.includes('emergency');
            if (isHealthCenter) return type.includes('health') || type.includes('unit') || type.includes('center');
            return true; // Default to all if unsure
        });

        // If no matches found with strict filtering, fallback to all sorted by distance
        if (filtered.length === 0) filtered = [...facilities];

        // Sort by distance (assuming distance is populated in store)
        // Facilities with undefined distance go to the end
        filtered.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));

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
        navigation.navigate('Find', {
            screen: 'FacilityDetails',
            params: { facilityId } 
        });
    };

    const getCareLevelInfo = (level: string) => {
        switch (level) {
            case 'emergency':
                return { label: 'EMERGENCY ROOM', color: theme.colors.error, icon: 'alert-octagon', bgColor: '#FEF2F2', borderColor: '#FCA5A5' };
            case 'hospital':
                return { label: 'HOSPITAL', color: '#E67E22', icon: 'hospital-building', bgColor: '#FFF7ED', borderColor: '#FDBA74' };
            case 'health_center':
                return { label: 'HEALTH CENTER', color: theme.colors.primary, icon: 'hospital-marker', bgColor: '#F0F9F6', borderColor: '#A7F3D0' };
            case 'self_care':
                return { label: 'SELF CARE', color: '#10B981', icon: 'home-heart', bgColor: '#F0FDF4', borderColor: '#BBF7D0' };
            default:
                return { label: level.toUpperCase(), color: theme.colors.primary, icon: 'hospital-building', bgColor: '#F0F9F6', borderColor: '#A7F3D0' };
        }
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

    const isEmergency = recommendation.recommended_level === 'emergency';
    const careInfo = getCareLevelInfo(recommendation.recommended_level);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Emergency Banner */}
                {isEmergency && (
                    <Surface style={[styles.emergencyBanner, { backgroundColor: theme.colors.error }]} elevation={2}>
                        <View style={styles.emergencyHeader}>
                            <MaterialCommunityIcons name="alert-octagon" size={40} color="white" />
                            <View style={styles.emergencyTextContainer}>
                                <Text style={styles.emergencyTitle}>URGENT CARE REQUIRED</Text>
                                <Text style={styles.emergencySubtitle}>Seek medical help immediately</Text>
                            </View>
                        </View>
                        <EmergencyButton 
                            onPress={() => handleCall('911')} 
                            style={styles.emergencyButton}
                            buttonColor="white"
                            textColor={theme.colors.error}
                        />
                    </Surface>
                )}

                {/* Recommendation Card */}
                <Card 
                    mode="flat" 
                    style={[
                        styles.card, 
                        { 
                            backgroundColor: careInfo.bgColor, 
                            borderColor: careInfo.borderColor,
                            borderWidth: 1
                        }
                    ]}
                >
                    <Card.Content style={styles.cardHeader}>
                        <Surface style={[styles.careBadge, { backgroundColor: 'white' }]} elevation={1}>
                            <MaterialCommunityIcons name={careInfo.icon as any} size={20} color={careInfo.color} />
                            <Text variant="labelLarge" style={[styles.careLabel, { color: careInfo.color }]}>
                                {careInfo.label}
                            </Text>
                        </Surface>
                    </Card.Content>

                    <Card.Content style={styles.section}>
                        <Text variant="labelMedium" style={styles.sectionLabel}>YOUR CONDITION</Text>
                        <Text variant="bodyLarge" style={styles.conditionText}>
                            {recommendation.condition_summary}
                        </Text>
                    </Card.Content>

                    <Card.Content style={styles.section}>
                        <Text variant="labelMedium" style={styles.sectionLabel}>RECOMMENDED ACTION</Text>
                        <Text variant="bodyLarge" style={[styles.actionText, { color: careInfo.color }]}>
                            {recommendation.recommended_action}
                        </Text>
                    </Card.Content>

                    {(recommendation.key_concerns.length > 0 || recommendation.critical_warnings.length > 0) && (
                        <View style={styles.warningContainer}>
                            {recommendation.critical_warnings.length > 0 && (
                                <View style={styles.warningSection}>
                                    <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.error }]}>RED FLAGS</Text>
                                    {recommendation.critical_warnings.map((warning, idx) => (
                                        <View key={`warn-${idx}`} style={styles.warningRow}>
                                            <MaterialCommunityIcons name="alert-octagon" size={20} color={theme.colors.error} />
                                            <Text variant="bodyMedium" style={[styles.warningText, { color: theme.colors.error }]}>
                                                {warning}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            
                            {recommendation.key_concerns.length > 0 && (
                                <View style={styles.concernsSection}>
                                    <Text variant="labelMedium" style={styles.sectionLabel}>KEY OBSERVATIONS</Text>
                                    <View style={styles.concernsList}>
                                        {recommendation.key_concerns.map((concern, idx) => (
                                            <View key={`concern-${idx}`} style={styles.concernRow}>
                                                <MaterialCommunityIcons 
                                                    name="information-outline" 
                                                    size={16} 
                                                    color="rgba(0,0,0,0.4)" 
                                                    style={{ marginTop: 2 }}
                                                />
                                                <Text variant="bodyMedium" style={styles.concernText}>
                                                    {concern}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </Card>

                {/* Facilities Section */}
                {recommendation.recommended_level !== 'self_care' && (
                    <View style={styles.facilitiesSection}>
                        <View style={styles.sectionHeader}>
                            <Text variant="titleLarge" style={styles.sectionHeading}>
                                {isEmergency ? "Nearest Emergency Care" : "Recommended Facilities"}
                            </Text>
                            <Text variant="bodySmall" style={styles.sectionSubtitle}>
                                Filtered for {careInfo.label.toLowerCase()} services
                            </Text>
                        </View>
                        
                        {recommendedFacilities.map(facility => (
                            <FacilityCard 
                                key={facility.id}
                                facility={facility} 
                                showDistance={true}
                                distance={facility.distance}
                                onPress={() => handleViewDetails(facility.id)}
                                relevantServices={recommendation.relevant_services}
                                simplified={true}
                            />
                        ))}

                        {recommendedFacilities.length === 0 && !isFacilitiesLoading && (
                             <Surface style={styles.emptyState} elevation={0}>
                                <MaterialCommunityIcons name="map-marker-off" size={48} color={theme.colors.outline} />
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                                    No facilities found nearby.
                                </Text>
                                <Button mode="text" onPress={() => dispatch(fetchFacilities({ page: 1, refresh: true }))}>
                                    Retry Loading
                                </Button>
                             </Surface>
                        )}
                        
                        {isFacilitiesLoading && recommendedFacilities.length === 0 && (
                            <ActivityIndicator style={{ marginTop: 20 }} />
                        )}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontWeight: '500' },
    content: { padding: 16, paddingVertical: 12, paddingBottom: 24 },
    
    emergencyBanner: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    emergencyTextContainer: { flex: 1, marginLeft: 12 },
    emergencyTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
    emergencySubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
    emergencyButton: { borderRadius: 12, marginVertical: 0 },
    
    card: { marginBottom: 32, borderRadius: 24, overflow: 'hidden' },
    cardHeader: { paddingTop: 20, paddingBottom: 8 },
    careBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    careLabel: { marginLeft: 8, fontWeight: '900', letterSpacing: 1, fontSize: 12 },
    
    section: { paddingVertical: 12 },
    sectionLabel: { 
        fontWeight: 'bold', 
        color: 'rgba(0,0,0,0.5)', 
        marginBottom: 8, 
        fontSize: 12, 
        letterSpacing: 1.2 
    },
    conditionText: { 
        lineHeight: 24, 
        fontWeight: '400',
        color: 'rgba(0,0,0,0.8)'
    },
    actionText: { 
        lineHeight: 26, 
        fontWeight: '700', 
        fontSize: 17 
    },
    
    warningContainer: { 
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)'
    },
    warningSection: {
        padding: 20,
        paddingBottom: 10,
    },
    concernsSection: {
        padding: 20,
        paddingTop: 10,
    },
    warningRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        marginBottom: 12,
        marginTop: 4 
    },
    warningText: { 
        flex: 1, 
        marginLeft: 12, 
        fontWeight: '800', 
        lineHeight: 22 
    },
    concernsList: { paddingLeft: 0, marginTop: 4 },
    concernRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    concernText: { 
        flex: 1, 
        color: 'rgba(0,0,0,0.7)', 
        lineHeight: 20,
        marginLeft: 10,
        fontWeight: '500'
    },
    
    facilitiesSection: { marginBottom: 24 },
    sectionHeader: { marginBottom: 16 },
    sectionHeading: { fontWeight: '800', fontSize: 22, color: '#333' },
    sectionSubtitle: { color: '#666', marginTop: 2, fontSize: 13 },
    
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'transparent' },
});

export default RecommendationScreen;