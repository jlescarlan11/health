import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Text, Surface, useTheme, IconButton } from 'react-native-paper';

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface DoctorHandoverCardProps {
  soapNote: SOAPNote;
  timestamp: number;
}

export const DoctorHandoverCard: React.FC<DoctorHandoverCardProps> = ({ soapNote, timestamp }) => {
  const [nurseMode, setNurseMode] = useState(false);
  const theme = useTheme();

  const formattedDate = new Date(timestamp).toLocaleString();

  const styles = nurseMode ? nurseModeStyles : standardStyles;

  const Section = ({ title, content }: { title: string; content: string }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>
  );

  return (
    <Surface style={styles.container} elevation={nurseMode ? 0 : 1}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clinical Handover Note</Text>
          <Text style={styles.headerSubtitle}>{formattedDate}</Text>
        </View>
        <TouchableOpacity
          style={[styles.modeToggle, nurseMode && styles.modeToggleActive]}
          onPress={() => setNurseMode(!nurseMode)}
          accessibilityLabel="Toggle Nurse Mode"
          accessibilityRole="button"
        >
          <Text style={[styles.modeToggleText, nurseMode && styles.modeToggleTextActive]}>
            {nurseMode ? 'Standard' : 'Nurse Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="S - Subjective" content={soapNote.subjective} />
        <Section title="O - Objective" content={soapNote.objective} />
        <Section title="A - Assessment" content={soapNote.assessment} />
        <Section title="P - Plan" content={soapNote.plan} />
      </ScrollView>

      {nurseMode && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Optimized for Clinical Triage</Text>
        </View>
      )}
    </Surface>
  );
};

const standardStyles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    maxHeight: 500,
  },
  header: {
    padding: 16,
    backgroundColor: '#379777', // Primary Green
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  modeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  modeToggleActive: {
    backgroundColor: '#FFFFFF',
  },
  modeToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modeToggleTextActive: {
    color: '#379777',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#379777',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: '#45474B',
  },
  footer: {
    display: 'none',
  },
  footerText: {
    display: 'none',
  },
});

const nurseModeStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  header: {
    padding: 20,
    backgroundColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60, // Account for notch
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modeToggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  modeToggleActive: {
    backgroundColor: '#FFFFFF',
  },
  modeToggleText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },
  modeToggleTextActive: {
    color: '#000000',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  content: {
    fontSize: 20,
    lineHeight: 28,
    color: '#000000',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
