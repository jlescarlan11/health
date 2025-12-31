import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Title, Paragraph, FAB, Button, Dialog, Portal, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setHasSeenDisclaimer } from '../store/settingsSlice';

type MainHomeNavigationProp = StackNavigationProp<RootStackParamList, 'MainHome'>;

export const MainHomeScreen = () => {
  const navigation = useNavigation<MainHomeNavigationProp>();
  const theme = useTheme();
  const dispatch = useDispatch();
  const hasSeenDisclaimer = useSelector((state: RootState) => state.settings.hasSeenDisclaimer);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (!hasSeenDisclaimer) {
      setShowDisclaimer(true);
    }
  }, [hasSeenDisclaimer]);

  const handleAcceptDisclaimer = async () => {
    dispatch(setHasSeenDisclaimer(true));
    setShowDisclaimer(false);
  };

  const FeatureCard = ({ title, subtitle, icon, color, onPress, testID }: { title: string, subtitle: string, icon: string, color: string, onPress: () => void, testID?: string }) => (
    <Card 
      style={styles.card} 
      onPress={onPress} 
      testID={testID} 
      accessible={true} 
      accessibilityLabel={`${title}, ${subtitle}`}
      accessibilityRole="button"
      accessibilityHint={`Double tap to navigate to ${title}`}
    >
      <Card.Content style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={32} color="white" />
        </View>
        <View style={styles.textContainer}>
          <Title style={styles.cardTitle}>{title}</Title>
          <Paragraph style={styles.cardSubtitle}>{subtitle}</Paragraph>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.greeting} accessibilityRole="header">Kumusta!</Text>
          <Text variant="titleMedium" style={styles.subGreeting}>How can we help you today?</Text>
        </View>

        <View style={styles.cardsContainer}>
          <FeatureCard
            title="Check Symptoms"
            subtitle="AI-powered health assessment"
            icon="stethoscope"
            color="#4CAF50"
            onPress={() => navigation.navigate('AiChat')}
          />
          <FeatureCard
            title="Find Facilities"
            subtitle="Locate nearby health centers"
            icon="hospital-marker"
            color="#2196F3"
            onPress={() => navigation.navigate('FacilityDirectory')}
          />
          <FeatureCard
            title="YAKAP Enrollment"
            subtitle="Register for healthcare benefits"
            icon="card-account-details"
            color="#FF9800"
            onPress={() => navigation.navigate('YakapEnrollment')}
          />
        </View>
      </ScrollView>

      <FAB
        icon="alert"
        style={[styles.fab, { backgroundColor: theme.colors.error }]}
        color="white"
        onPress={() => Alert.alert('Emergency', 'Call 911 or visit the nearest emergency room immediately.')}
        label="Emergency"
        accessibilityLabel="Emergency Call"
        accessibilityHint="Double tap to see emergency instructions"
        accessibilityRole="button"
      />

      <Portal>
        <Dialog visible={showDisclaimer} onDismiss={() => {}} dismissable={false}>
          <Dialog.Title accessibilityRole="header">Welcome to HEALTH</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              This application provides health information and guidance but is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleAcceptDisclaimer} accessibilityHint="Double tap to accept terms and continue">I Understand</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80, // Space for FAB
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    color: '#666',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    marginBottom: 10,
    elevation: 2,
    borderRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});