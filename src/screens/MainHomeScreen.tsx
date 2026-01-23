import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Paragraph, Title, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../types/navigation';
import { selectLatestClinicalNote } from '../store/offlineSlice';

// Import the new components
import HomeHero from '../components/heroes/HomeHero';

type MainHomeNavigationProp = RootStackScreenProps<'Home'>['navigation'];

export const MainHomeScreen = () => {
  const navigation = useNavigation<MainHomeNavigationProp>();
  const theme = useTheme();
  const lastNote = useSelector(selectLatestClinicalNote);

  const FeatureCard = ({
    title,
    subtitle,
    icon,
    color,
    onPress,
    testID,
    compact = false,
  }: {
    title: string;
    subtitle?: string;
    icon: keyof (typeof MaterialCommunityIcons)['glyphMap'];
    color: string;
    onPress: () => void;
    testID?: string;
    compact?: boolean;
  }) => {
    return (
      <Card
        style={[
          styles.card,
          compact ? styles.cardCompact : styles.cardWide,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.04,
            shadowRadius: 24,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.6)',
          },
        ]}
        onPress={onPress}
        testID={testID}
        accessible={true}
        accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
        accessibilityRole="button"
        accessibilityHint={`Double tap to navigate to ${title}`}
      >
        <Card.Content style={[styles.cardContent, compact && styles.cardContentCompact]}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: color + '26' },
              compact && styles.iconContainerCompact,
            ]}
          >
            <MaterialCommunityIcons name={icon} size={compact ? 20 : 28} color={color} />
          </View>

          <View style={styles.textContainer}>
            <Title
              numberOfLines={2}
              style={[
                styles.cardTitle,
                compact && styles.cardTitleCompact,
                { color: theme.colors.onSurface },
                subtitle ? { marginBottom: compact ? 4 : 2 } : { marginBottom: 0 },
              ]}
            >
              {title}
            </Title>
            {subtitle && (
              <Paragraph
                numberOfLines={2}
                style={[
                  styles.cardSubtitle,
                  compact && styles.cardSubtitleCompact,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {subtitle}
              </Paragraph>
            )}
          </View>

          {!compact && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.colors.primary}
              style={{ opacity: 0.8 }}
            />
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HomeHero />

        <View style={styles.cardsContainer}>
          <View style={styles.bottomStack}>
            {lastNote && (
              <View style={styles.bottomStackItem}>
                <FeatureCard
                  title="Clinical Handover"
                  subtitle={`Note from ${new Date(lastNote.timestamp).toLocaleDateString()}`}
                  icon="doctor"
                  color={theme.colors.primary}
                  onPress={() => navigation.navigate('ClinicalNote')}
                />
              </View>
            )}
            <View style={styles.bottomStackItem}>
              <FeatureCard
                title="Check Symptoms"
                subtitle="AI-powered health assessment"
                icon="stethoscope"
                color={theme.colors.primary}
                onPress={() => navigation.navigate('Check', { screen: 'CheckSymptom' })}
              />
            </View>
            <View style={styles.bottomStackItem}>
              <FeatureCard
                title="Facility Directory"
                subtitle="Find hospitals & health centers nearby"
                icon="hospital-marker"
                color={theme.colors.primary}
                onPress={() =>
                  navigation.navigate('Find', { screen: 'FacilityDirectory', params: {} })
                }
              />
            </View>
            <View style={styles.bottomStackItem}>
              <FeatureCard
                title="YAKAP Guide"
                subtitle="Enrollment guide for free healthcare"
                icon="card-account-details"
                color={theme.colors.primary}
                onPress={() => navigation.navigate('YAKAP', { screen: 'YakapHome' })}
              />
            </View>
          </View>
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
    gap: 16,
  },
  bottomStack: {
    flexDirection: 'column',
    gap: 16,
  },
  bottomStackItem: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  card: {
    borderRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
  },
  cardWide: {
    width: '100%',
  },
  cardCompact: {
    flex: 1,
  },
  cardContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContentCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 24, // Squircle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerCompact: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginBottom: 0,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  cardTitleCompact: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 0,
  },
  cardSubtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
});
