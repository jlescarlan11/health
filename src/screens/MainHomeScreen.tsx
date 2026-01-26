import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../types/navigation';
import { selectLatestClinicalNote } from '../store/offlineSlice';
import { RootState } from '../store';
import { YakapLogo, CheckSymptomsLogo, FacilityDirectoryLogo, Text } from '../components/common';
import { FeedItem, FeedItemData } from '../components/features/feed/FeedItem';

// Import the new components
import HomeHero from '../components/heroes/HomeHero';

type MainHomeNavigationProp = RootStackScreenProps<'Home'>['navigation'];

export const MainHomeScreen = () => {
  const navigation = useNavigation<MainHomeNavigationProp>();
  const theme = useTheme();
  const lastNote = useSelector(selectLatestClinicalNote);
  const { items } = useSelector((state: RootState) => state.feed);

  const FeatureCard = ({
    title,
    subtitle,
    customIcon,
    color,
    onPress,
    testID,
  }: {
    title: string;
    subtitle?: string;
    customIcon: React.ReactNode;
    color: string;
    onPress: () => void;
    testID?: string;
  }) => {
    return (
      <Card
        style={[
          styles.card,
          styles.cardWide,
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
        <Card.Content style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: color }]}>{customIcon}</View>

          <View style={styles.textContainer}>
            <Text
              variant="titleLarge"
              numberOfLines={2}
              style={[
                styles.cardTitle,
                { color: theme.colors.onSurface },
                subtitle ? { marginBottom: 2 } : { marginBottom: 0 },
              ]}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                variant="bodyMedium"
                numberOfLines={2}
                style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}
              >
                {subtitle}
              </Text>
            )}
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

  const MOCK_PREVIEW: FeedItemData[] = [
    {
      id: '1',
      title: 'Naga City Health Tips',
      category: 'Prevention',
      description: 'Protect yourself from seasonal illnesses with these local health guidelines.',
      icon: 'shield-check-outline',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      title: 'Upcoming Vaccination Drive',
      category: 'Community',
      description: "Free vaccinations available at the Naga City People's Hall this Friday.",
      icon: 'needle',
      timestamp: '5 hours ago',
    },
  ];

  const previewData = (items && items.length > 0) ? items.slice(0, 2) : MOCK_PREVIEW;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HomeHero
          hasClinicalReport={!!lastNote}
          onClinicalReportPress={() => navigation.navigate('ClinicalNote', {})}
        />

        <View style={styles.cardsContainer}>
          <View style={styles.bottomStack}>
            <View style={styles.bottomStackItem}>
              <FeatureCard
                title="Check Symptoms"
                subtitle="AI-powered health assessment"
                customIcon={<CheckSymptomsLogo width={44} height={44} />}
                color={theme.colors.primary}
                onPress={() => navigation.navigate('Check', { screen: 'CheckSymptom' })}
              />
            </View>
            <View style={styles.bottomStackItem}>
              <FeatureCard
                title="Facility Directory"
                subtitle="Find hospitals & health centers nearby"
                customIcon={<FacilityDirectoryLogo width={44} height={44} />}
                color={theme.colors.secondary}
                onPress={() =>
                  navigation.navigate('Find', { screen: 'FacilityDirectory', params: {} })
                }
              />
            </View>
            <View style={styles.bottomStackItem}>
              <FeatureCard
                title="YAKAP Guide"
                subtitle="Enrollment guide for free healthcare"
                customIcon={<YakapLogo width={44} height={44} />}
                color={theme.colors.primary}
                onPress={() => navigation.navigate('YAKAP', { screen: 'YakapHome' })}
              />
            </View>
          </View>

          <View style={styles.feedSection}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Discover Latest News
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Home', { screen: 'HealthFeed' })}>
                <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.feedList}>
              {previewData.map((item) => (
                <FeedItem
                  key={item.id}
                  item={item}
                  onPress={() => navigation.navigate('Home', { screen: 'HealthFeed' })}
                />
              ))}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  bottomStack: {
    flexDirection: 'column',
    gap: 16,
  },
  bottomStackItem: {
    width: '100%',
  },
  feedSection: {
    marginTop: 24,
  },
  feedList: {
    marginTop: 0,
    gap: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
  },
  cardWide: {
    width: '100%',
  },
  cardContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 24, // Squircle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 0,
  },
});
