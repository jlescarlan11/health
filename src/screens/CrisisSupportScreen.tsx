import React from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { Text, Button, Card, useTheme, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MENTAL_HEALTH_RESOURCES, MentalHealthResource } from '../services/mentalHealthDetector';

const CrisisSupportScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const handleCall = (number: string) => {
    // Clean number for tel: link (remove non-digits except +)
    const phoneNumber = number.replace(/[^0-9+]/g, '');
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        } else {
          return Linking.openURL(url);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const ResourceCard = ({ resource }: { resource: MentalHealthResource }) => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={0}>
      <Card.Content>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
          {resource.name}
        </Text>
        <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
          {resource.description}
        </Text>
        <Button 
          mode="contained" 
          icon="phone" 
          onPress={() => handleCall(resource.number)}
          style={{ marginTop: 8 }}
          buttonColor={theme.colors.error}
        >
          Call {resource.number}
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={() => navigation.goBack()}
            style={{ position: 'absolute', right: 0, top: 0 }}
          />
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            You Are Not Alone
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Help is available. Please reach out to one of these free, confidential services.
          </Text>
        </View>

        <Surface style={[styles.alertBox, { backgroundColor: theme.colors.secondaryContainer, borderLeftColor: theme.colors.secondary }]} elevation={0}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>
            If you are in immediate danger or have a medical emergency, please go to the nearest hospital immediately.
          </Text>
        </Surface>

        <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Crisis Hotlines
        </Text>

        {MENTAL_HEALTH_RESOURCES.map((resource, index) => (
          <ResourceCard key={index} resource={resource} />
        ))}

        <View style={styles.footer}>
          <Button 
            mode="outlined" 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            textColor={theme.colors.primary}
          >
            I'm safe, go back
          </Button>
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
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  subtitle: {
    textAlign: 'center',
  },
  alertBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    borderWidth: 1,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  backButton: {
    width: '100%',
  },
});

export default CrisisSupportScreen;
