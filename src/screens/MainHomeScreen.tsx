import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Dialog, Paragraph, Portal, Title, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabScreenProps } from '../types/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setHasSeenDisclaimer } from '../store/settingsSlice';

// Import the new components
import HomeHero from '../components/heroes/HomeHero';
import { EmergencyButton } from '../components/common/EmergencyButton';


type MainHomeNavigationProp = TabScreenProps<'Home'>['navigation'];

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainHomeScreen.tsx:30',message:'MainHomeScreen mounted',data:{platform:Platform.OS,hasSeenDisclaimer,iconLibrary:'@expo/vector-icons'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }, [hasSeenDisclaimer]);

  const handleAcceptDisclaimer = async () => {
    dispatch(setHasSeenDisclaimer(true));
    setShowDisclaimer(false);
  };

  const FeatureCard = ({ title, subtitle, icon, color, onPress, testID }: { title: string, subtitle: string, icon: any, color: string, onPress: () => void, testID?: string }) => {
    // #region agent log
    React.useEffect(() => {
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainHomeScreen.tsx:42',message:'FeatureCard render',data:{title,iconName:icon,color,iconLibrary:'@expo/vector-icons'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    }, [title, icon, color]);
    // #endregion

    return (
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
            {/* #region agent log */}
            {(() => {
              fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainHomeScreen.tsx:60',message:'Rendering MaterialCommunityIcons',data:{iconName:icon,title,size:32,iconLibrary:'@expo/vector-icons'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
              return null;
            })()}
            {/* #endregion */}
            <MaterialCommunityIcons name={icon} size={32} color="white" />
          </View>
          <View style={styles.textContainer}>
            <Title style={styles.cardTitle}>{title}</Title>
            <Paragraph style={styles.cardSubtitle}>{subtitle}</Paragraph>
          </View>
          {/* #region agent log */}
          {(() => {
            fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainHomeScreen.tsx:72',message:'Rendering MaterialCommunityIcons chevron',data:{iconName:'chevron-right',size:24,iconLibrary:'@expo/vector-icons'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
            return null;
          })()}
          {/* #endregion */}
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <HomeHero />

        <View style={styles.cardsContainer}>
          <FeatureCard
            title="Check Symptoms"
            subtitle="AI-powered health assessment"
            icon="stethoscope"
            color="#4CAF50"
            onPress={() => {
              navigation.navigate('Check', { screen: 'NavigatorHome' });
            }}
          />
          <FeatureCard
            title="Find Facilities"
            subtitle="Locate nearby health centers"
            icon="hospital-marker"
            color="#2196F3"
            onPress={() => {
              navigation.navigate('Find', { screen: 'FacilityDirectory', params: {} });
            }}
          />
          <FeatureCard
            title="YAKAP Enrollment"
            subtitle="Register for healthcare benefits"
            icon="card-account-details"
            color="#FF9800"
            onPress={() => {
              navigation.navigate('YAKAP', { screen: 'YakapEnrollment' });
            }}
          />
        </View>
      </ScrollView>

      <View style={styles.fabContainer}>
        <EmergencyButton
            onPress={() => Alert.alert('Emergency', 'Call 911 or visit the nearest emergency room immediately.')}
        />
      </View>

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
    paddingBottom: 100, // Increased padding to avoid overlap with the emergency button
  },
  cardsContainer: {
    marginTop: 24,
    paddingHorizontal: 20, // Apply padding here for cards, not to HomeHero
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    left: 16,
  },
});