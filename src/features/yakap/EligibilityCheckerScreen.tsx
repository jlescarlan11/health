import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, useTheme, Divider, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { YakapStackScreenProps } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';

type Props = YakapStackScreenProps<'EligibilityChecker'>;

export const EligibilityCheckerScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [hasPhilHealth, setHasPhilHealth] = useState<boolean | null>(null);

  const handlePhilHealthLink = () => {
    Linking.openURL('https://www.philhealth.gov.ph/services/epr/');
  };

  const handleMap = () => {
    const query = 'PhilHealth Local Health Insurance Office';
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(query)}`,
      android: `geo:0,0?q=${encodeURIComponent(query)}`,
    });
    if (url) Linking.openURL(url);
  };

  const renderContent = () => {
    if (hasPhilHealth === null) {
      return (
        <View style={styles.centerContent}>
          <Text variant="headlineSmall" style={styles.questionText}>
            Do you have a PhilHealth Identification Number (PIN)?
          </Text>
          <Text variant="bodyMedium" style={styles.subText}>
            This is required to enroll in the YAKAP Program.
          </Text>
          
          <View style={styles.buttonGroup}>
            <Button 
                variant="primary" 
                onPress={() => setHasPhilHealth(true)} 
                style={styles.mainButton}
                contentStyle={styles.buttonContent}
                icon="check"
                title="Yes, I have PhilHealth"
            />
            <Button 
                variant="outline" 
                onPress={() => setHasPhilHealth(false)} 
                style={styles.secondaryButton}
                contentStyle={styles.buttonContent}
                title="No, I don't have it yet"
            />
          </View>
        </View>
      );
    }

    if (hasPhilHealth === true) {
      return (
        <View>
          <View style={styles.successHeader}>
            <MaterialCommunityIcons name="check-circle" size={80} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={[styles.successTitle, { color: theme.colors.primary }]}>
                You’re Eligible!
            </Text>
            <Text variant="bodyLarge" style={styles.successSubtitle}>
                Since you have a PhilHealth PIN, you can join YAKAP immediately.
            </Text>
          </View>
          
          <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleMedium" style={{marginBottom: 10}}>What you get:</Text>
                <View style={styles.bulletRow}>
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={styles.bulletPoint}>No age restrictions</Text>
                </View>
                <View style={styles.bulletRow}>
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={styles.bulletPoint}>No income restrictions</Text>
                </View>
                <View style={styles.bulletRow}>
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={styles.bulletPoint}>Covered dependents included</Text>
                </View>
            </Card.Content>
          </Card>

          <Button 
            variant="primary" 
            onPress={() => navigation.navigate('EnrollmentPathway')}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            icon="arrow-right"
            title="Choose Enrollment Method"
          />
        </View>
      );
    }

    if (hasPhilHealth === false) {
      return (
        <View>
          <Text variant="headlineSmall" style={styles.guidanceTitle}>Get PhilHealth First</Text>
          <Text variant="bodyMedium" style={styles.guidanceText}>
            Every Filipino is eligible for PhilHealth. You just need to register to get your PIN, then you can join YAKAP.
          </Text>

          <Card style={styles.card}>
             <Card.Title title="Option 1: Online Registration" left={(props) => <MaterialCommunityIcons {...props} name="web" />} />
             <Card.Content>
                <Text variant="bodySmall" style={{marginBottom: 10}}>The fastest way if you have internet access.</Text>
                <Button variant="text" onPress={handlePhilHealthLink} icon="open-in-new" title="Visit PhilHealth Website" />
             </Card.Content>
          </Card>

          <Card style={styles.card}>
             <Card.Title title="Option 2: Visit Local Office" left={(props) => <MaterialCommunityIcons {...props} name="office-building" />} />
             <Card.Content>
                <Text variant="bodySmall" style={{marginBottom: 10}}>Go to the nearest PhilHealth Local Health Insurance Office.</Text>
                <Button variant="outline" onPress={handleMap} icon="map-marker" title="Find Nearest Office" />
             </Card.Content>
          </Card>

          <View style={styles.helpSection}>
             <Text variant="labelLarge">Need Assistance?</Text>
             <View style={styles.contactRow}>
                <MaterialCommunityIcons name="phone" size={18} color={theme.colors.secondary} />
                <Text variant="bodyMedium" style={styles.contactText}>Hotline: (02) 8441-7442</Text>
             </View>
          </View>

          <Button 
            variant="text" 
            onPress={() => navigation.goBack()}
            style={{marginTop: 20}}
            title="Back to Home"
          />
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StandardHeader title="Eligibility Check" showBackButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {hasPhilHealth === null && (
             <View style={styles.heroSection}>
                <MaterialCommunityIcons name="shield-check" size={60} color={theme.colors.secondary} />
             </View>
        )}
        
        {renderContent()}

        {hasPhilHealth !== null && (
            <View style={styles.footer}>
                <Text variant="bodySmall" style={styles.footerText}>
                    Note: YAKAP is a benefit for all PhilHealth members.
                </Text>
            </View>
        )}
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
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  questionText: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  subText: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  mainButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  successTitle: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  successSubtitle: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletPoint: {
    marginLeft: 12,
  },
  actionButton: {
    marginTop: 24,
  },
  guidanceTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  guidanceText: {
    marginBottom: 24,
    lineHeight: 22,
  },
  helpSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  contactText: {
    marginLeft: 8,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontStyle: 'italic',
  },
});
