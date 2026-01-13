import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button } from '../../components/common/Button';

type Props = RootStackScreenProps<'EligibilityChecker'>;

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

  const renderBenefitsCard = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 10, color: theme.colors.onSurface }}>What you get:</Text>
          <View style={styles.bulletRow}>
              <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={[styles.bulletPoint, { color: theme.colors.onSurfaceVariant }]}>No age restrictions</Text>
          </View>
          <View style={styles.bulletRow}>
              <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={[styles.bulletPoint, { color: theme.colors.onSurfaceVariant }]}>No income restrictions</Text>
          </View>
          <View style={styles.bulletRow}>
              <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={[styles.bulletPoint, { color: theme.colors.onSurfaceVariant }]}>Covered dependents included</Text>
          </View>
      </Card.Content>
    </Card>
  );

  const renderContent = () => {
    if (hasPhilHealth === null) {
      return (
        <View>
          <Text variant="headlineSmall" style={[styles.questionText, { color: theme.colors.onSurface }]}>
            Do you have a PhilHealth Identification Number (PIN)?
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 12, opacity: 0.8 }}>
            The YAKAP program is an additional benefit provided to all PhilHealth members.
          </Text>
          <Text variant="bodyMedium" style={[styles.subText, { color: theme.colors.onSurfaceVariant }]}>
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
            <Text variant="bodyLarge" style={[styles.successSubtitle, { color: theme.colors.onSurfaceVariant, opacity: 0.7 }]}>
                Since you have a PhilHealth PIN, you can join YAKAP immediately.
            </Text>
          </View>
          
          {renderBenefitsCard()}

          <Button 
            variant="primary" 
            onPress={() => navigation.navigate('EnrollmentPathway')}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            icon="arrow-right"
            title="Choose Enrollment Method"
          />

          <Button 
            variant="outline" 
            onPress={() => navigation.goBack()}
            style={{ marginTop: 20 }}
            title="Back to Home"
          />

          <Button 
            variant="text" 
            onPress={() => setHasPhilHealth(null)} 
            style={{ marginTop: 8, opacity: 0.7 }}
            title="Change my answer"
          />
        </View>
      );
    }

    if (hasPhilHealth === false) {
      return (
        <View>
          <View style={styles.successHeader}>
            <MaterialCommunityIcons name="information-outline" size={80} color={theme.colors.secondary} />
            <Text variant="headlineMedium" style={[styles.guidanceTitle, { color: theme.colors.secondary }]}>
                Step 1: Obtain your PhilHealth PIN
            </Text>
          </View>
          <Text variant="bodyLarge" style={[styles.guidanceText, { color: theme.colors.onSurfaceVariant, opacity: 0.7 }]}>
            Every Filipino is eligible for PhilHealth. You just need to register to get your PIN, then you can join YAKAP.
          </Text>

          <Text variant="titleMedium" style={{ marginBottom: 16, color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Choose your registration path:
          </Text>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
             <Card.Title 
                title="1. Online Registration" 
                titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                left={(props) => <MaterialCommunityIcons {...props} name="numeric-1-circle" color={theme.colors.primary} />} 
             />
             <Card.Content>
                <Text variant="bodySmall" style={{ marginBottom: 10, color: theme.colors.onSurfaceVariant }}>The fastest way if you have internet access.</Text>
                <Button variant="text" onPress={handlePhilHealthLink} icon="open-in-new" title="Visit PhilHealth Website" />
             </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
             <Card.Title 
                title="2. Visit Local Office" 
                titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                left={(props) => <MaterialCommunityIcons {...props} name="numeric-2-circle" color={theme.colors.primary} />} 
             />
             <Card.Content>
                <Text variant="bodySmall" style={{ marginBottom: 10, color: theme.colors.onSurfaceVariant }}>Go to the nearest PhilHealth Local Health Insurance Office.</Text>
                <Button variant="outline" onPress={handleMap} icon="map-marker" title="Find Nearest Office" />
             </Card.Content>
          </Card>

          <View style={{ marginVertical: 16, padding: 16, backgroundColor: theme.colors.primaryContainer, borderRadius: 12 }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, textAlign: 'center', fontWeight: '500' }}>
              Once you receive your PIN, return to this app to complete your YAKAP enrollment.
            </Text>
          </View>

          <View style={styles.helpSection}>
             <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Need Assistance?</Text>
             <View style={styles.contactRow}>
                <MaterialCommunityIcons name="phone" size={18} color={theme.colors.secondary} />
                <Text variant="bodyMedium" style={[styles.contactText, { color: theme.colors.onSurfaceVariant }]}>Hotline: (02) 8441-7442</Text>
             </View>
          </View>

          <Button 
            variant="outline" 
            onPress={() => navigation.goBack()}
            style={{ marginTop: 32 }}
            title="Back to Home"
          />

          <Button 
            variant="text" 
            onPress={() => setHasPhilHealth(null)} 
            style={{ marginTop: 8, opacity: 0.7 }}
            title="Change my answer"
          />
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <StandardHeader title="Eligibility Check" showBackButton />
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}>
        {hasPhilHealth === null && (
             <View style={styles.heroSection}>
                <MaterialCommunityIcons name="shield-check" size={60} color={theme.colors.secondary} />
             </View>
        )}
        
        {renderContent()}
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
    paddingBottom: 40,
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  questionText: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subText: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
    marginTop: 20,
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
    marginBottom: 24,
    marginTop: 10,
  },
  successTitle: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  successSubtitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    marginBottom: 12,
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
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 16,
  },
  guidanceText: {
    marginBottom: 16,
    lineHeight: 22,
    textAlign: 'center',
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
    fontStyle: 'italic',
  },
});
