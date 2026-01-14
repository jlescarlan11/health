import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';
import { YakapBenefitsCard } from '../../components/features/yakap';

type EnrollmentCompletionNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EnrollmentCompletion'
>;

const EnrollmentCompletionScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EnrollmentCompletionNavigationProp>();

  const navigateToFacilities = () => {
    // Navigate to Find tab with YAKAP filter
    // @ts-ignore - cross-tab navigation
    navigation.navigate('Find', {
      screen: 'FacilityDirectory',
      params: { filter: 'yakap' },
    });
  };

  const handleBackToHome = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Guide Complete" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.celebrationContainer}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Enrollment Guide Complete
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            You now have all the information needed to finalize your enrollment. Visit an accredited
            health center to start receiving your benefits.
          </Text>
        </View>

        <YakapBenefitsCard style={{ marginBottom: 40 }} />

        <View style={styles.actionContainer}>
          <Button
            variant="primary"
            onPress={navigateToFacilities}
            title="Find Nearest YAKAP Clinic"
          />

          <Button
            variant="text"
            onPress={handleBackToHome}
            title="Return to YAKAP Home"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  celebrationContainer: {
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'left',
    marginTop: 16,
    lineHeight: 24,
  },
  actionContainer: {
    gap: 12,
  },
});

export default EnrollmentCompletionScreen;
