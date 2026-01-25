import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton, Divider, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../store';
import { StandardHeader, Button } from '../components/common';
import { parseSoap, formatClinicalShareText } from '../utils/clinicalUtils';
import * as Clipboard from 'expo-clipboard';

export const ClinicalNoteScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const latestAssessment = useSelector((state: RootState) => state.offline.latestAssessment);

  const [copied, setCopied] = useState(false);

  if (!latestAssessment) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="bodyLarge">Clinical note not found.</Text>
        <IconButton
          icon="home"
          mode="contained"
          onPress={() => navigation.navigate('Home' as never)}
          style={styles.homeButton}
        />
      </View>
    );
  }

  const sections = parseSoap(latestAssessment.clinical_soap);
  const formattedDate = new Date(latestAssessment.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handleShare = async () => {
    const text = formatClinicalShareText(
      latestAssessment.clinical_soap,
      latestAssessment.timestamp,
      latestAssessment.medical_justification,
    );
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Section = ({ title, content }: { title: string; content?: string }) => {
    if (!content) return null;
    return (
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>
          {title}
        </Text>
        <Text variant="bodyLarge" style={styles.sectionContent}>
          {content}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader
        title="Clinical Handover"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall" style={styles.reportTitle}>
            Clinical Report
          </Text>
          <Text variant="bodyMedium" style={styles.timestamp}>
            {formattedDate}
          </Text>
          <Divider style={styles.divider} />
        </View>

        {sections.s || sections.o || sections.a || sections.p ? (
          <>
            <Section title="SUBJECTIVE (History)" content={sections.s} />
            <Section title="OBJECTIVE (Signs)" content={sections.o} />
            <Section title="ASSESSMENT (Triage)" content={sections.a} />
            <Section title="PLAN (Next Steps)" content={sections.p} />
          </>
        ) : (
          <Text variant="bodyLarge" style={styles.rawText}>
            {latestAssessment.clinical_soap}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          variant={copied ? 'outline' : 'primary'}
          onPress={handleShare}
          style={styles.shareButton}
          title={copied ? 'Copied!' : 'Copy for Handover'}
          icon={copied ? 'check' : 'content-copy'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  homeButton: {
    marginTop: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 24,
  },
  headerInfo: {
    marginBottom: 24,
  },
  reportTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  timestamp: {
    opacity: 0.7,
    marginBottom: 16,
  },
  divider: {
    height: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    lineHeight: 24,
  },
  rawText: {
    lineHeight: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  shareButton: {
    width: '100%',
  },
});
