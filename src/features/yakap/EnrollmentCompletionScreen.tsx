import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Share, Animated } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YakapStackParamList } from '../../navigation/types';
import StandardHeader from '../../components/common/StandardHeader';
import { YAKAP_BENEFITS } from './yakapContent';

type EnrollmentCompletionNavigationProp = StackNavigationProp<YakapStackParamList, 'EnrollmentCompletion'>;

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
        message: 'I just completed my YAKAP enrollment! 🎉 Now I have access to free primary care consultations, laboratory tests, and essential medicines in Naga City. Check out the HEALTH app to enroll too!',
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
      params: { filter: 'yakap' }
    });
  };

  const handleBackToHome = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StandardHeader title="Congratulations" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.celebrationContainer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
            <MaterialCommunityIcons name="check-decagram" size={100} color={theme.colors.primary} />
          </Animated.View>
          <Text variant="headlineMedium" style={styles.title}>You're all set!</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Your YAKAP enrollment has been successfully recorded. You can now start enjoying your healthcare benefits.
          </Text>
        </View>

        <Card style={styles.benefitsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.benefitsHeader}>Your YAKAP Benefits Summary:</Text>
            {YAKAP_BENEFITS.map((benefit) => (
              <View key={benefit.id} style={styles.benefitItem}>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#4CAF50" style={styles.benefitIcon} />
                <View style={styles.benefitTextContent}>
                  <Text variant="labelLarge">{benefit.category}</Text>
                  <Text variant="bodySmall" style={styles.benefitDesc}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        <View style={styles.actionContainer}>
          <Button 
            mode="contained" 
            icon="hospital-marker" 
            onPress={navigateToFacilities}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
          >
            Find Nearest YAKAP Clinic
          </Button>
          
          <Button 
            mode="outlined" 
            icon="share-variant" 
            onPress={handleShare}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
          >
            Share Achievement
          </Button>

          <Button 
            mode="text" 
            onPress={handleBackToHome}
            style={styles.backButton}
          >
            Back to YAKAP Home
          </Button>
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.7,
    lineHeight: 24,
  },
  benefitsCard: {
    width: '100%',
    marginVertical: 20,
    elevation: 2,
    backgroundColor: '#F9F9F9',
  },
  benefitsHeader: {
    fontWeight: 'bold',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 15,
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
    opacity: 0.6,
  },
  actionContainer: {
    width: '100%',
    marginTop: 10,
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  backButton: {
    marginTop: 10,
  },
});

export default EnrollmentCompletionScreen;
