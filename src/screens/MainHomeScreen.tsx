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
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'MainHomeScreen.tsx:30',
        message: 'MainHomeScreen mounted',
        data: { platform: Platform.OS, hasSeenDisclaimer, iconLibrary: '@expo/vector-icons' },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
  }, [hasSeenDisclaimer]);

  const handleAcceptDisclaimer = async () => {
    dispatch(setHasSeenDisclaimer(true));
    setShowDisclaimer(false);
  };

  const FeatureCard = ({
    title,
    subtitle,
    icon,
    color,
    iconColor,
    onPress,
    testID,
  }: {
    title: string;
    subtitle: string;
    icon: any;
    color: string;
    iconColor?: string;
    onPress: () => void;
    testID?: string;
  }) => {
    // #region agent log
    React.useEffect(() => {
      fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'MainHomeScreen.tsx:42',
          message: 'FeatureCard render',
          data: { title, iconName: icon, color, iconLibrary: '@expo/vector-icons' },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'A',
        }),
      }).catch(() => {});
    }, [title, icon, color]);
    // #endregion

    return (
      <Card
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
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
              fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'MainHomeScreen.tsx:60',
                  message: 'Rendering MaterialCommunityIcons',
                  data: { iconName: icon, title, size: 32, iconLibrary: '@expo/vector-icons' },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  runId: 'post-fix',
                  hypothesisId: 'A',
                }),
              }).catch(() => {});
              return null;
            })()}
            {/* #endregion */}
            <MaterialCommunityIcons name={icon} size={32} color={iconColor || theme.colors.onPrimary} />
          </View>
          <View style={styles.textContainer}>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{title}</Title>
            <Paragraph style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Paragraph>
          </View>
          {/* #region agent log */}
          {(() => {
            fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'MainHomeScreen.tsx:72',
                message: 'Rendering MaterialCommunityIcons chevron',
                data: { iconName: 'chevron-right', size: 24, iconLibrary: '@expo/vector-icons' },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'post-fix',
                hypothesisId: 'A',
              }),
            }).catch(() => {});
            return null;
          })()}
          {/* #endregion */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <HomeHero />

        <View style={styles.cardsContainer}>
          <FeatureCard
            title="Check Symptoms"
            subtitle="AI-powered health assessment"
            icon="stethoscope"
            color={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            onPress={() => {
              navigation.navigate('Check', { screen: 'NavigatorHome' });
            }}
          />
          <FeatureCard
            title="Find Facilities"
            subtitle="Locate nearby health centers"
            icon="hospital-marker"
            color={theme.colors.secondary}
            iconColor={theme.colors.onSecondary}
            onPress={() => {
              navigation.navigate('Find', { screen: 'FacilityDirectory', params: {} });
            }}
          />
          <FeatureCard
            title="YAKAP Enrollment"
            subtitle="Register for healthcare benefits"
            icon="card-account-details"
            color={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            onPress={() => {
              navigation.navigate('YAKAP', { screen: 'YakapEnrollment' });
            }}
          />
        </View>
      </ScrollView>

      <View style={styles.fabContainer}>
        <EmergencyButton
          onPress={() =>
            Alert.alert('Emergency', 'Call 911 or visit the nearest emergency room immediately.')
          }
        />
      </View>

      <Portal>
        <Dialog visible={showDisclaimer} onDismiss={() => {}} dismissable={false} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title accessibilityRole="header" style={{ color: theme.colors.onSurface }}>Welcome to HEALTH</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
              This application provides health information and guidance but is not a substitute for
              professional medical advice, diagnosis, or treatment. Always seek the advice of your
              physician or other qualified health provider with any questions you may have regarding
              a medical condition.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={handleAcceptDisclaimer}
              accessibilityHint="Double tap to accept terms and continue"
              textColor={theme.colors.primary}
            >
              I Understand
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardsContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    elevation: 0, // Kanso: Simplify by removing shadow
    borderWidth: 1, // Add subtle border for definition
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
  },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    left: 16,
  },
});
