import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Surface, Text, Button, Divider } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DoctorHandoverCardProps {
  clinicalSoap: string;
  timestamp: number;
}

interface SoapSections {
  s?: string;
  o?: string;
  a?: string;
  p?: string;
}

export const DoctorHandoverCard: React.FC<DoctorHandoverCardProps> = ({
  clinicalSoap,
  timestamp,
}) => {
  const [copied, setCopied] = useState(false);
  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Attempt to parse simple S: O: A: P: format
  const parseSoap = (text: string): SoapSections => {
    // Basic regex to capture content between markers
    // Note: This assumes the standard order S -> O -> A -> P
    const sMatch = text.match(/S:\s*(.*?)(?=\s*O:|$)/s);
    const oMatch = text.match(/O:\s*(.*?)(?=\s*A:|$)/s);
    const aMatch = text.match(/A:\s*(.*?)(?=\s*P:|$)/s);
    const pMatch = text.match(/P:\s*(.*?)$/s);

    // If parsing fails completely (e.g. valid JSON string of old format), try parsing as JSON first
    if (!sMatch && !oMatch && !aMatch && !pMatch) {
       try {
         const json = JSON.parse(text);
         if (json.subjective || json.objective) {
           return {
             s: json.subjective,
             o: json.objective,
             a: json.assessment,
             p: json.plan
           }
         }
       } catch (e) {
         // Not JSON, just plain text
       }
    }

    return {
      s: sMatch ? sMatch[1].trim() : undefined,
      o: oMatch ? oMatch[1].trim() : undefined,
      a: aMatch ? aMatch[1].trim() : undefined,
      p: pMatch ? pMatch[1].trim() : undefined,
    };
  };

  const sections = parseSoap(clinicalSoap);
  const isParsed = !!(sections.s || sections.o || sections.a || sections.p);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(
      `CLINICAL HANDOVER REPORT\nDate: ${formattedDate}\n\n${clinicalSoap}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (Platform.OS !== 'web') {
        Alert.alert("Report Copied", "The clinical report has been copied to your clipboard.");
    }
  };

  const SectionBlock = ({ label, content }: { label: string; content?: string }) => {
    if (!content) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionContent}>{content}</Text>
      </View>
    );
  };

  return (
    <Surface style={styles.paperContainer} elevation={4}> 
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <MaterialCommunityIcons name="file-document-outline" size={32} color="black" />
          <Text style={styles.headerTitle}>CLINICAL REPORT</Text>
        </View>
        <Text style={styles.timestamp}>{formattedDate}</Text>
        <Divider style={styles.headerDivider} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {isParsed ? (
          <>
            <SectionBlock label="SUBJECTIVE (History)" content={sections.s} />
            <SectionBlock label="OBJECTIVE (Signs)" content={sections.o} />
            <SectionBlock label="ASSESSMENT (Triage)" content={sections.a} />
            <SectionBlock label="PLAN (Next Steps)" content={sections.p} />
          </>
        ) : (
          <Text style={styles.sectionContent}>{clinicalSoap}</Text>
        )}
      </ScrollView>

      {/* Footer / Actions */}
      <View style={styles.footer}>
        <Divider style={styles.footerDivider} />
        <Button
          mode="contained"
          onPress={handleCopy}
          icon={copied ? 'check' : 'content-copy'}
          style={styles.copyButton}
          contentStyle={styles.copyButtonContent}
          labelStyle={styles.copyButtonLabel}
          buttonColor="#000000"
        >
          {copied ? 'COPIED TO CLIPBOARD' : 'SHARE AS TEXT'}
        </Button>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  paperContainer: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 4, // Sharp corners for paper feel
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 600,
  },
  header: {
    padding: 24,
    paddingBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '900',
    fontSize: 24,
    color: '#000000',
    marginLeft: 12,
    letterSpacing: 1,
  },
  timestamp: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14,
    color: '#333333',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  headerDivider: {
    backgroundColor: '#000000',
    height: 2,
  },
  scrollArea: {
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 18, // Large for readability
    fontWeight: '500',
    color: '#000000', // AAA Contrast
    lineHeight: 28,
  },
  footer: {
    padding: 24,
    paddingTop: 0,
    backgroundColor: '#FFFFFF',
  },
  footerDivider: {
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  copyButton: {
    borderRadius: 4,
  },
  copyButtonContent: {
    height: 56,
  },
  copyButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
