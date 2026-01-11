import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YakapStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<YakapStackParamList, 'YakapEnrollment'>;

export const YakapEnrollmentScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Title style={[styles.headerTitle, { color: theme.colors.primary }]}>Welcome to YAKAP Enrollment</Title>
          <Paragraph style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Your journey to free healthcare starts here. Follow the steps below to register for the YAKAP Program.
          </Paragraph>
        </View>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>Step 1: Check Eligibility</Title>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
              Find out if you are eligible for the YAKAP Program and what documents you need.
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('EligibilityChecker')}
              style={styles.button}
              buttonColor={theme.colors.primary}
            >
              Check Now
            </Button>
          </Card.Actions>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface }}>Step 2: Choose Pathway</Title>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
              Select the most convenient way for you to register (Online, App, or Walk-in).
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('EnrollmentPathway')}
              style={styles.button}
              buttonColor={theme.colors.primary}
            >
              Select Pathway
            </Button>
          </Card.Actions>
        </Card>
        
        {/* Placeholder for future steps or direct access if already started */}
        <View style={styles.infoSection}>
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                Already started? Go to your profile to check your status.
            </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    borderWidth: 1,
  },
  button: {
    marginTop: 8,
  },
  infoSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  infoText: {
  },
});