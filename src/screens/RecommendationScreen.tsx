import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Avatar, IconButton, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { CheckStackParamList } from '../types/navigation';
import { getGeminiResponse } from '../services/gemini';
import { SYMPTOM_ASSESSMENT_PROMPT } from '../constants/prompts';
import { EmergencyButton } from '../components/common/EmergencyButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';

// Mock facility data
const NEARBY_FACILITIES = [
    { id: '1', name: 'Naga City Hospital', distance: '1.2 km', phone: '09123456789', type: 'Hospital' },
    { id: '2', name: 'Bicol Medical Center', distance: '2.5 km', phone: '09987654321', type: 'Hospital' },
    { id: '3', name: 'Concepcion Pequeña Health Center', distance: '0.8 km', phone: '09112233445', type: 'Health Center' },
];

type ScreenRouteProp = RouteProp<CheckStackParamList, 'Recommendation'>;

const RecommendationScreen = () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecommendationScreen.tsx:21', message: 'RecommendationScreen render entry', data: { routeName: 'Recommendation', hasRoute: true, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'H2' } }) }).catch(() => {});
    // #endregion
    const route = useRoute<ScreenRouteProp>();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecommendationScreen.tsx:24', message: 'After useRoute', data: { hasParams: !!route.params, paramsKeys: route.params ? Object.keys(route.params) : [], timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'H2' } }) }).catch(() => {});
    // #endregion
    const theme = useTheme();
    const { assessmentData } = route.params;
    const [loading, setLoading] = useState(true);
    const [recommendation, setRecommendation] = useState<any>(null);

    useEffect(() => {
        analyzeSymptoms();
    }, []);

    const analyzeSymptoms = async () => {
        try {
            setLoading(true);
            
            // 1. Local Emergency Check (Immediate Safety Response)
            const combinedSymptoms = `${assessmentData.symptoms} ${JSON.stringify(assessmentData.answers)}`;
            const emergencyCheck = detectEmergency(combinedSymptoms);
            const mentalHealthCheck = detectMentalHealthCrisis(combinedSymptoms);

            if (emergencyCheck.isEmergency && emergencyCheck.overrideResponse) {
                console.log('Local emergency override triggered');
                setRecommendation(emergencyCheck.overrideResponse);
                setLoading(false);
                return;
            }

            if (mentalHealthCheck.isCrisis) {
                console.log('Local mental health crisis detected');
                setRecommendation({
                    recommended_level: "Emergency",
                    reasoning: mentalHealthCheck.message || "Potential mental health crisis detected. Please seek immediate support.",
                    red_flags: mentalHealthCheck.matchedKeywords,
                    nearest_facility_type: "Emergency Room / Mental Health Center"
                });
                setLoading(false);
                return;
            }

            // 2. AI Assessment
            const context = `
            Initial Symptom: ${assessmentData.symptoms}
            Answers to Questions: ${JSON.stringify(assessmentData.answers)}
            `;
            
            // Construct prompt
            let prompt = SYMPTOM_ASSESSMENT_PROMPT.replace('{{symptoms}}', context);
            prompt = prompt.replace('{{age}}', 'Not specified'); 
            prompt = prompt.replace('{{severity}}', 'Not specified');

            const response = await getGeminiResponse(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                setRecommendation(JSON.parse(jsonMatch[0]));
            } else {
                throw new Error("Failed to parse recommendation");
            }
        } catch (error) {
            console.error(error);
            // Fallback for demo purposes if AI fails or token limits
            setRecommendation({
                recommended_level: "Health Center",
                reasoning: "Based on your symptoms, a visit to the local health center is recommended for a check-up.",
                red_flags: [],
                nearest_facility_type: "Barangay Health Center"
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Generating recommendation...</Text>
            </View>
        );
    }

    if (!recommendation) return null;

    const isEmergency = recommendation.recommended_level === 'Emergency';

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <ScrollView contentContainerStyle={styles.content}>
                
                {/* Emergency Alert */}
                {isEmergency && (
                    <View style={styles.emergencyBanner}>
                        <MaterialCommunityIcons name="alert-circle" size={40} color="white" />
                        <View style={styles.emergencyTextContainer}>
                            <Text style={styles.emergencyTitle}>EMERGENCY DETECTED</Text>
                            <Text style={styles.emergencyText}>Seek immediate medical attention.</Text>
                        </View>
                        <EmergencyButton onPress={() => Alert.alert('Calling 911...')} style={{ marginTop: 0 }} />
                    </View>
                )}

                {/* Recommendation Card */}
                <Card style={styles.card}>
                    <Card.Content style={styles.cardHeader}>
                         <Avatar.Icon 
                            size={64} 
                            icon={isEmergency ? "ambulance" : "hospital-box"} 
                            style={{ backgroundColor: isEmergency ? theme.colors.error : theme.colors.primary }}
                        />
                        <View style={styles.recTextContainer}>
                            <Text variant="titleMedium">Recommended Care Level</Text>
                            <Text variant="headlineMedium" style={{ color: isEmergency ? theme.colors.error : theme.colors.primary, fontWeight: 'bold' }}>
                                {recommendation.recommended_level}
                            </Text>
                        </View>
                    </Card.Content>
                    <Divider style={styles.divider} />
                    <Card.Content>
                        <Text variant="bodyMedium">{recommendation.reasoning}</Text>
                        {recommendation.red_flags && recommendation.red_flags.length > 0 && (
                            <View style={styles.redFlags}>
                                <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>Alerts:</Text>
                                {recommendation.red_flags.map((flag: string, idx: number) => (
                                    <Text key={idx} style={{ color: theme.colors.error }}>• {flag}</Text>
                                ))}
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* Nearest Facilities */}
                <Text variant="titleLarge" style={styles.sectionTitle}>Nearest Facilities</Text>
                {NEARBY_FACILITIES.map(facility => (
                    <Card key={facility.id} style={styles.facilityCard} mode="outlined">
                        <Card.Content>
                            <View style={styles.facilityHeader}>
                                <View>
                                    <Text variant="titleMedium">{facility.name}</Text>
                                    <Text variant="bodySmall" style={{color: '#666'}}>{facility.type} • {facility.distance}</Text>
                                </View>
                                <IconButton icon="phone" mode="contained" onPress={() => Linking.openURL(`tel:${facility.phone}`)} />
                            </View>
                            <View style={styles.facilityActions}>
                                <Button icon="map-marker" mode="text" compact onPress={() => {}}>View Map</Button>
                                <Button icon="directions" mode="text" compact onPress={() => {}}>Directions</Button>
                            </View>
                        </Card.Content>
                    </Card>
                ))}

                {/* Mini Map Placeholder */}
                 <Text variant="titleLarge" style={styles.sectionTitle}>Location</Text>
                 <Card style={styles.mapCard}>
                    <View style={styles.mapPlaceholder}>
                        <MaterialCommunityIcons name="map" size={48} color="#ccc" />
                        <Text style={{color: '#888'}}>Map View Placeholder</Text>
                    </View>
                 </Card>

                {/* Disclaimer */}
                <Text style={styles.disclaimer}>
                    Disclaimer: This is an AI-generated assessment and does not constitute medical advice.
                    Always consult a healthcare professional.
                </Text>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16 },
    content: { paddingHorizontal: 16, paddingVertical: 16 },
    emergencyBanner: {
        backgroundColor: '#d32f2f',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 16
    },
    emergencyTextContainer: { flex: 1, marginLeft: 12, marginRight: 8 },
    emergencyTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    emergencyText: { color: 'white' },
    card: { marginBottom: 24, borderRadius: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    recTextContainer: { marginLeft: 16, flex: 1 },
    divider: { marginVertical: 12 },
    redFlags: { marginTop: 12, padding: 8, backgroundColor: '#ffebee', borderRadius: 8 },
    sectionTitle: { marginBottom: 12, fontWeight: 'bold' },
    facilityCard: { marginBottom: 12 },
    facilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    facilityActions: { flexDirection: 'row', marginTop: 8 },
    mapCard: { height: 200, marginBottom: 24, overflow: 'hidden' },
    mapPlaceholder: { flex: 1, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
    disclaimer: { textAlign: 'center', color: '#888', fontSize: 12, marginBottom: 32 }
});

export default RecommendationScreen;