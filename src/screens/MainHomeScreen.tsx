import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Paragraph, Title, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../types/navigation';

// Import the new components
import HomeHero from '../components/heroes/HomeHero';

type MainHomeNavigationProp = RootStackScreenProps<'Home'>['navigation'];

export const MainHomeScreen = () => {
  const navigation = useNavigation<MainHomeNavigationProp>();
  const theme = useTheme();

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'MainHomeScreen.tsx:30',
        message: 'MainHomeScreen mounted',
        data: { platform: Platform.OS, iconLibrary: '@expo/vector-icons' },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
  }, []);

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
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          },
        ]}
        onPress={onPress}
        testID={testID}
        accessible={true}
        accessibilityLabel={`${title}, ${subtitle}`}
        accessibilityRole="button"
        accessibilityHint={`Double tap to navigate to ${title}`}
      >
        <Card.Content style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: color + 'D9' }]}>
            <MaterialCommunityIcons name={icon} size={28} color={iconColor || color} />
          </View>
          <View style={styles.textContainer}>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{title}</Title>
            <Paragraph style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {subtitle}
            </Paragraph>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.primary}
            style={{ opacity: 0.8 }}
          />
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
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
              navigation.navigate('YAKAP', { screen: 'YakapHome' });
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  cardsContainer: {
    marginTop: 16,
    paddingHorizontal: 24,
    gap: 20,
  },
  card: {
    borderRadius: 20,
    elevation: 2,
    borderWidth: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },

  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
});
