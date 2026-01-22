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
    iconColor,
    onPress,
    variant = 'wide',
    testID,
  }: {
    title: string;
    subtitle: string;
    icon: keyof (typeof MaterialCommunityIcons)['glyphMap'];
    color: string;
    iconColor?: string;
    onPress: () => void;
    variant?: 'square' | 'wide';
    testID?: string;
  }) => {
    const isSquare = variant === 'square';

    return (
      <Card
        style={[
          styles.card,
          isSquare ? styles.cardSquare : styles.cardWide,
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
        accessibilityLabel={`${title}, ${subtitle}`}
        accessibilityRole="button"
        accessibilityHint={`Double tap to navigate to ${title}`}
      >
        <Card.Content style={[styles.cardContent, isSquare && styles.cardContentSquare]}>
          {isSquare ? (
            <>
              <View style={styles.cardHeaderSquare}>
                <View style={[styles.iconContainer, { backgroundColor: color + '26' }]}>
                  <MaterialCommunityIcons name={icon} size={28} color={color} />
                </View>
              </View>
              
              <View style={styles.textContainer}>
                <Title 
                  numberOfLines={2}
                  style={[
                    styles.cardTitle, 
                    { color: theme.colors.onSurface },
                    { fontSize: 16, lineHeight: 22, marginTop: 12 }
                  ]}
                >
                  {title}
                </Title>
                <Paragraph 
                  numberOfLines={3}
                  style={[
                    styles.cardSubtitle, 
                    { color: theme.colors.onSurfaceVariant },
                    { fontSize: 13, lineHeight: 18 }
                  ]}
                >
                  {subtitle}
                </Paragraph>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.iconContainer, { backgroundColor: color + '26' }]}>
                <MaterialCommunityIcons name={icon} size={28} color={color} />
              </View>
              
              <View style={styles.textContainer}>
                <Title 
                  numberOfLines={2}
                  style={[
                    styles.cardTitle, 
                    { color: theme.colors.onSurface }
                  ]}
                >
                  {title}
                </Title>
                <Paragraph 
                  numberOfLines={2}
                  style={[
                    styles.cardSubtitle, 
                    { color: theme.colors.onSurfaceVariant }
                  ]}
                >
                  {subtitle}
                </Paragraph>
              </View>
              
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.colors.primary}
                style={{ opacity: 0.8 }}
              />
            </>
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
          {/* First Row: Clinical Handover + Check Symptoms (Square) OR just Check Symptoms (Wide) */}
          <View style={styles.row}>
            {lastNote && (
              <FeatureCard
                title="Clinical Handover"
                subtitle={`Note from ${new Date(lastNote.timestamp).toLocaleDateString()}`}
                icon="doctor"
                color={theme.colors.primary}
                iconColor={theme.colors.onPrimary}
                variant="square"
                onPress={() => navigation.navigate('ClinicalNote')}
              />
            )}
            <FeatureCard
              title="Check Symptoms"
              subtitle="AI-powered health assessment"
              icon="stethoscope"
              color={theme.colors.secondary}
              iconColor={theme.colors.onSecondary}
              variant={lastNote ? 'square' : 'wide'}
              onPress={() => navigation.navigate('Check', { screen: 'NavigatorHome' })}
            />
          </View>

          {/* Second Row: Find Facilities (Wide) */}
          <FeatureCard
            title="Find Facilities"
            subtitle="Locate nearby health centers"
            icon="hospital-marker"
            color={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            variant="wide"
            onPress={() => navigation.navigate('Find', { screen: 'FacilityDirectory', params: {} })}
          />

          {/* Third Row: YAKAP Enrollment (Wide) */}
          <FeatureCard
            title="YAKAP Enrollment"
            subtitle="Register for healthcare benefits"
            icon="card-account-details"
            color={theme.colors.secondary}
            iconColor={theme.colors.onSecondary}
            variant="wide"
            onPress={() => navigation.navigate('YAKAP', { screen: 'YakapHome' })}
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
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
  },
  cardWide: {
    width: '100%',
  },
  cardSquare: {
    flex: 1,
    aspectRatio: 1, // Ensures perfect square
  },
  cardContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContentSquare: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    height: '100%',
  },
  cardHeaderSquare: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
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
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 0,
  },
});
