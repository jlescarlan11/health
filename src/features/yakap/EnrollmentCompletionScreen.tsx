import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Share, Animated } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';
import { YAKAP_BENEFITS } from './yakapContent';

type EnrollmentCompletionNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EnrollmentCompletion'
>;

const EnrollmentCompletionScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EnrollmentCompletionNavigationProp>();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          'I just finished learning how to enroll in YAKAP! 🎉 This program provides free primary care, lab tests, and medicines in Naga City. Check out the HEALTH app to see how you can benefit too!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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
      edges={['top', 'left', 'right']}
    >
      <StandardHeader title="Guide Completed" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.celebrationContainer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
            <MaterialCommunityIcons name="check-decagram" size={100} color={theme.colors.primary} />
          </Animated.View>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Guide Completed
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            You have finished the informational walkthrough. You now have all the details needed to
            visit a health center and complete your official enrollment.
          </Text>
        </View>

        <Card
          style={[
            styles.benefitsCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[styles.benefitsHeader, { color: theme.colors.onSurface }]}
            >
              YAKAP Program Benefits:
            </Text>
            {YAKAP_BENEFITS.map((benefit) => (
              <View key={benefit.id} style={styles.benefitItem}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.benefitIcon}
                />
                <View style={styles.benefitTextContent}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                    {benefit.category}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.benefitDesc, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {benefit.description}
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        <View style={styles.actionContainer}>
          <Button
            variant="primary"
            icon="hospital-marker"
            onPress={navigateToFacilities}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            title="Find Nearest YAKAP Clinic"
          />

          <Button
            variant="text"
            icon="share-variant"
            onPress={handleShare}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            title="Share this Guide"
          />

          <Button
            variant="text"
            onPress={handleBackToHome}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
            title="Back to YAKAP Home"
          />
        </View>

        <View style={{ height: 120 }} />
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
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    opacity: 0.8,
  },
  benefitsCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    elevation: 0,
  },
  benefitsHeader: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  benefitIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  benefitTextContent: {
    flex: 1,
  },
  benefitDesc: {
    marginTop: 2,
    lineHeight: 18,
    opacity: 0.7,
  },
  actionContainer: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
  },
});

export default EnrollmentCompletionScreen;
